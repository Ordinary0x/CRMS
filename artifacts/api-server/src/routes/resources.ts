import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";

const router: IRouter = Router();

// GET /resources/categories — must be before /:id
router.get("/resources/categories", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM resource_category ORDER BY category_name"
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /resources
router.get("/resources", verifyToken, async (req, res): Promise<void> => {
  const { category_id, min_capacity, date, start_time, end_time, search } = req.query;
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (category_id) { conditions.push(`r.category_id = $${idx++}`); params.push(Number(category_id)); }
    if (min_capacity) { conditions.push(`r.capacity >= $${idx++}`); params.push(Number(min_capacity)); }
    if (search) {
      conditions.push(`(r.resource_name ILIKE $${idx} OR r.location ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await client.query(
       `SELECT r.*, rc.category_name, COALESCE(r.approval_steps_override, rc.approval_steps) AS approval_steps,
        CONCAT(u.first_name, ' ', u.last_name) as manager_name
       FROM resource r
       JOIN resource_category rc ON rc.category_id = r.category_id
       LEFT JOIN users u ON u.user_id = r.manager_id
       ${where}
       ORDER BY r.resource_name`,
      params
    );

    // Add is_available flag based on conflicts
    const resources = result.rows;
    if (date && start_time && end_time) {
      for (const resource of resources) {
        const conflictResult = await client.query(
          `SELECT COUNT(*) FROM booking
           WHERE resource_id = $1 AND date = $2
             AND status_id IN (SELECT status_id FROM booking_status WHERE status_name IN ('Pending','Approved'))
             AND start_time < $3 AND end_time > $4`,
          [resource.resource_id, date, end_time, start_time]
        );
        resource.is_available = resource.status === "active" && parseInt(conflictResult.rows[0].count, 10) === 0;
      }
    } else {
      for (const resource of resources) {
        resource.is_available = resource.status === "active";
      }
    }

    res.json(resources);
  } finally {
    client.release();
  }
});

// GET /resources/:id
router.get("/resources/:id", verifyToken, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    const result = await client.query(
       `SELECT r.*, rc.category_name, COALESCE(r.approval_steps_override, rc.approval_steps) AS approval_steps,
        CONCAT(u.first_name, ' ', u.last_name) as manager_name,
       d.dept_name as department_name,
       COALESCE(
         (SELECT json_agg(json_build_object(
           'unavail_id', ru.unavail_id,
           'resource_id', ru.resource_id,
           'day_of_week', ru.day_of_week,
           'start_time', ru.start_time,
           'end_time', ru.end_time,
           'label', ru.label
         ))
          FROM resource_unavailability ru WHERE ru.resource_id = r.resource_id
         ), '[]'::json
       ) as unavailability
       FROM resource r
       JOIN resource_category rc ON rc.category_id = r.category_id
       LEFT JOIN users u ON u.user_id = r.manager_id
       LEFT JOIN department d ON d.department_id = r.department_id
       WHERE r.resource_id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

// GET /resources/:id/availability
router.get("/resources/:id/availability", verifyToken, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { date } = req.query;

  if (!date) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  const client = await pool.connect();
  try {
    const resourceCheck = await client.query(
      `SELECT r.resource_id, r.status, r.category_id
       FROM resource r
       WHERE r.resource_id = $1`,
      [id]
    );

    if (!resourceCheck.rows[0]) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    const resource = resourceCheck.rows[0];

    if (resource.status !== "active") {
      res.status(400).json({ error: "Resource is not active" });
      return;
    }

    const blackoutResult = await client.query(
      `SELECT 1
       FROM blackout_period bp
       WHERE ($2::date BETWEEN bp.start_date AND bp.end_date)
         AND (bp.category_id IS NULL OR bp.category_id = $1)
       LIMIT 1`,
      [resource.category_id, date]
    );

    if (blackoutResult.rows[0]) {
      res.status(400).json({ error: "Date falls within a blackout period" });
      return;
    }

    const busyResult = await client.query(
      `SELECT b.start_time, b.end_time, b.booking_id, b.purpose
       FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name IN ('Pending','Approved')
       WHERE b.resource_id = $1 AND b.date = $2
       ORDER BY b.start_time`,
      [id, date]
    );

    const busySlots = busyResult.rows;

    // Generate free slots between busy slots (8 AM to 8 PM)
    const freeSlots: { start_time: string; end_time: string }[] = [];
    const dayStart = "08:00";
    const dayEnd = "20:00";

    let current = dayStart;
    for (const slot of busySlots) {
      if (slot.start_time > current) {
        freeSlots.push({ start_time: current, end_time: slot.start_time });
      }
      current = slot.end_time;
    }
    if (current < dayEnd) {
      freeSlots.push({ start_time: current, end_time: dayEnd });
    }

    res.json({ busy_slots: busySlots, free_slots: freeSlots });
  } finally {
    client.release();
  }
});

export default router;
