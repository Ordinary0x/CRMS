import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";
import { checkRole } from "../middlewares/checkRole";

const router: IRouter = Router();
const rmAuth = [verifyToken, checkRole("resource_manager")];

// GET /rm/resources
router.get("/rm/resources", ...rmAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT r.*, rc.category_name, rc.approval_steps,
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
       WHERE r.manager_id = $1
       ORDER BY r.resource_name`,
      [req.user!.user_id]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// POST /rm/resources
router.post("/rm/resources", ...rmAuth, async (req, res): Promise<void> => {
  const { resource_name, capacity, location, status = "active", features = {}, category_id, department_id } = req.body;
  if (!resource_name || !capacity || !category_id) {
    res.status(400).json({ error: "resource_name, capacity, and category_id are required" });
    return;
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO resource(resource_name, capacity, location, status, features, category_id, manager_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [resource_name, capacity, location ?? null, status, JSON.stringify(features), category_id, req.user!.user_id, department_id ?? null]
    );
    const resource = result.rows[0];
    const catResult = await client.query(
      "SELECT category_name, approval_steps FROM resource_category WHERE category_id = $1",
      [category_id]
    );
    resource.category_name = catResult.rows[0]?.category_name;
    resource.approval_steps = catResult.rows[0]?.approval_steps;
    resource.manager_name = `${req.user!.first_name} ${req.user!.last_name}`;
    resource.unavailability = [];
    res.status(201).json(resource);
  } finally {
    client.release();
  }
});

// PATCH /rm/resources/:id
router.patch("/rm/resources/:id", ...rmAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { resource_name, capacity, location, status, features, category_id, department_id } = req.body;
  const client = await pool.connect();
  try {
    const check = await client.query(
      "SELECT manager_id FROM resource WHERE resource_id = $1",
      [id]
    );
    if (!check.rows[0] || check.rows[0].manager_id !== req.user!.user_id) {
      res.status(403).json({ error: "You don't manage this resource" });
      return;
    }

    const result = await client.query(
      `UPDATE resource SET
       resource_name = COALESCE($1, resource_name),
       capacity = COALESCE($2, capacity),
       location = COALESCE($3, location),
       status = COALESCE($4, status),
       features = COALESCE($5, features),
       category_id = COALESCE($6, category_id),
       department_id = COALESCE($7, department_id)
       WHERE resource_id = $8
       RETURNING *`,
      [resource_name, capacity, location, status, features ? JSON.stringify(features) : null, category_id, department_id, id]
    );
    const resource = result.rows[0];
    const catResult = await client.query(
      "SELECT category_name, approval_steps FROM resource_category WHERE category_id = $1",
      [resource.category_id]
    );
    resource.category_name = catResult.rows[0]?.category_name;
    resource.approval_steps = catResult.rows[0]?.approval_steps;
    resource.manager_name = `${req.user!.first_name} ${req.user!.last_name}`;
    resource.unavailability = [];
    res.json(resource);
  } finally {
    client.release();
  }
});

// PATCH /rm/resources/:id/status
router.patch("/rm/resources/:id/status", ...rmAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { status } = req.body;

  if (!status || !["active", "inactive", "maintenance"].includes(status)) {
    res.status(400).json({ error: "status must be active, inactive, or maintenance" });
    return;
  }
  const client = await pool.connect();
  try {
    const check = await client.query(
      "SELECT manager_id FROM resource WHERE resource_id = $1",
      [id]
    );
    if (!check.rows[0] || check.rows[0].manager_id !== req.user!.user_id) {
      res.status(403).json({ error: "You don't manage this resource" });
      return;
    }
    await client.query("UPDATE resource SET status = $1 WHERE resource_id = $2", [status, id]);
    res.json({ message: `Resource status updated to ${status}` });
  } finally {
    client.release();
  }
});

// POST /rm/resources/:id/unavailability
router.post("/rm/resources/:id/unavailability", ...rmAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { day_of_week, start_time, end_time, label } = req.body;

  if (!start_time || !end_time) {
    res.status(400).json({ error: "start_time and end_time are required" });
    return;
  }
  const client = await pool.connect();
  try {
    const check = await client.query(
      "SELECT manager_id FROM resource WHERE resource_id = $1",
      [id]
    );
    if (!check.rows[0] || check.rows[0].manager_id !== req.user!.user_id) {
      res.status(403).json({ error: "You don't manage this resource" });
      return;
    }

    const result = await client.query(
      `INSERT INTO resource_unavailability(resource_id, day_of_week, start_time, end_time, label)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, day_of_week ?? null, start_time, end_time, label ?? null]
    );
    res.status(201).json(result.rows[0]);
  } finally {
    client.release();
  }
});

// DELETE /rm/resources/:id/unavailability/:uid
router.delete("/rm/resources/:id/unavailability/:uid", ...rmAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const rawUid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
  const uid = parseInt(rawUid, 10);
  const client = await pool.connect();
  try {
    const check = await client.query(
      "SELECT manager_id FROM resource WHERE resource_id = $1",
      [id]
    );
    if (!check.rows[0] || check.rows[0].manager_id !== req.user!.user_id) {
      res.status(403).json({ error: "You don't manage this resource" });
      return;
    }

    await client.query("DELETE FROM resource_unavailability WHERE unavail_id = $1 AND resource_id = $2", [uid, id]);
    res.json({ message: "Unavailability window deleted" });
  } finally {
    client.release();
  }
});

// GET /rm/approvals/pending
router.get("/rm/approvals/pending", ...rmAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT a.*, b.date, b.start_time, b.end_time, b.purpose, b.priority_level, b.created_at,
       r.resource_name, rc.category_name,
       CONCAT(u.first_name, ' ', u.last_name) as requester_name,
       u.email as requester_email,
       NULL::text as step1_approved_by
       FROM approval a
       JOIN booking b ON b.booking_id = a.booking_id
       JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name = 'Pending'
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       JOIN users u ON u.user_id = b.user_id
       WHERE a.step_number = 1
         AND a.decision IS NULL
         AND r.manager_id = $1
       ORDER BY b.priority_level ASC, b.created_at ASC`,
      [req.user!.user_id]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// POST /rm/approvals/:id/decide
router.post("/rm/approvals/:id/decide", ...rmAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { decision, remarks } = req.body;
  const normalizedDecision = typeof decision === "string" ? decision.toLowerCase() : "";
  const decisionValue = normalizedDecision === "approved" ? "Approved" : normalizedDecision === "rejected" ? "Rejected" : null;

  if (!decisionValue) {
    res.status(400).json({ error: "decision must be Approved or Rejected" });
    return;
  }
  if (decisionValue === "Rejected" && !remarks) {
    res.status(400).json({ error: "Remarks are required for rejection" });
    return;
  }

  const client = await pool.connect();
  try {
    const approvalResult = await client.query(
      `SELECT a.*, b.user_id, rc.approval_steps
       FROM approval a
       JOIN booking b ON b.booking_id = a.booking_id
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       WHERE a.approval_id = $1
         AND a.step_number = 1
         AND a.decision IS NULL
         AND r.manager_id = $2`,
       [id, req.user!.user_id]
    );
    if (!approvalResult.rows[0]) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }

    const approval = approvalResult.rows[0];
    await client.query(
      `UPDATE approval SET decision = $1, remarks = $2, approver_id = $3, approval_time = now()
       WHERE approval_id = $4`,
      [decisionValue, remarks ?? null, req.user!.user_id, id]
    );

    if (decisionValue === "Rejected") {
      const statusResult = await client.query(
        "SELECT status_id FROM booking_status WHERE status_name = 'Rejected'"
      );
      await client.query(
        "UPDATE booking SET status_id = $1 WHERE booking_id = $2",
        [statusResult.rows[0].status_id, approval.booking_id]
      );
      await client.query(
        "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
        [approval.user_id, `Your booking #${approval.booking_id} has been rejected by the Resource Manager.`]
      );
    } else if (approval.approval_steps >= 2) {
      // Needs HOD approval — create step 2 approval record
      await client.query(
        "INSERT INTO approval(booking_id, step_number) SELECT $1, 2 WHERE NOT EXISTS (SELECT 1 FROM approval WHERE booking_id = $1 AND step_number = 2)",
        [approval.booking_id]
      );
      await client.query(
        "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
        [approval.user_id, `Your booking #${approval.booking_id} has passed step-1 review and is now awaiting HOD approval.`]
      );
    } else {
      // Auto-approve
      const statusResult = await client.query(
        "SELECT status_id FROM booking_status WHERE status_name = 'Approved'"
      );
      await client.query(
        "UPDATE booking SET status_id = $1 WHERE booking_id = $2",
        [statusResult.rows[0].status_id, approval.booking_id]
      );
      await client.query(
        "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
        [approval.user_id, `Your booking #${approval.booking_id} has been approved.`]
      );
    }

    res.json({ message: `Booking ${decisionValue === "Approved" ? "approved" : "rejected"}` });
  } finally {
    client.release();
  }
});

// GET /rm/analytics
router.get("/rm/analytics", ...rmAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const [stats, resourceCounts, byResource] = await Promise.all([
      client.query(
        `SELECT
         COUNT(b.booking_id)::INT as total_bookings,
         COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Pending')::INT as pending_bookings,
         COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Approved')::INT as approved_bookings,
         COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Rejected')::INT as rejected_bookings,
         COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Cancelled')::INT as cancelled_bookings
         FROM booking b
         JOIN booking_status bs ON bs.status_id = b.status_id
         JOIN resource r ON r.resource_id = b.resource_id
         WHERE r.manager_id = $1`,
        [req.user!.user_id]
      ),
      client.query(
        `SELECT
         COUNT(*)::INT as total_resources,
         COUNT(*) FILTER (WHERE status = 'active')::INT as active_resources,
         COUNT(*) FILTER (WHERE status = 'maintenance')::INT as maintenance_resources
         FROM resource WHERE manager_id = $1`,
        [req.user!.user_id]
      ),
      client.query(
        `SELECT r.resource_id, r.resource_name, rc.category_name,
         COUNT(b.booking_id)::INT as total_bookings,
         COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Approved')::INT as approved_bookings,
         COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Pending')::INT as pending_bookings,
         COALESCE(SUM(EXTRACT(EPOCH FROM ((b.date::TIMESTAMP + b.end_time) - (b.date::TIMESTAMP + b.start_time))) / 3600.0), 0) as booked_hours
         FROM resource r
         JOIN resource_category rc ON rc.category_id = r.category_id
         LEFT JOIN booking b ON b.resource_id = r.resource_id
         LEFT JOIN booking_status bs ON bs.status_id = b.status_id
         WHERE r.manager_id = $1
         GROUP BY r.resource_id, r.resource_name, rc.category_name
         ORDER BY total_bookings DESC`,
        [req.user!.user_id]
      ),
    ]);

    res.json({
      ...stats.rows[0],
      ...resourceCounts.rows[0],
      utilization_by_resource: byResource.rows,
    });
  } finally {
    client.release();
  }
});

// GET /rm/dashboard
router.get("/rm/dashboard", ...rmAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const [myResources, pendingApprovals, todaysBookings, statusBreakdown] = await Promise.all([
      client.query("SELECT COUNT(*)::INT as count FROM resource WHERE manager_id = $1", [req.user!.user_id]),
      client.query(
        `SELECT COUNT(*)::INT as count FROM approval a
         JOIN booking b ON b.booking_id = a.booking_id
         JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name = 'Pending'
         JOIN resource r ON r.resource_id = b.resource_id
         WHERE a.step_number = 1 AND a.decision IS NULL AND r.manager_id = $1`,
        [req.user!.user_id]
      ),
      client.query(
        `SELECT COUNT(*)::INT as count FROM booking b
         JOIN resource r ON r.resource_id = b.resource_id
         WHERE r.manager_id = $1 AND b.date = CURRENT_DATE`,
        [req.user!.user_id]
      ),
      client.query(
        `SELECT
         COUNT(*) FILTER (WHERE status = 'active')::INT as active,
         COUNT(*) FILTER (WHERE status = 'inactive')::INT as inactive,
         COUNT(*) FILTER (WHERE status = 'maintenance')::INT as maintenance
         FROM resource WHERE manager_id = $1`,
        [req.user!.user_id]
      ),
    ]);

    res.json({
      my_resources: myResources.rows[0].count,
      pending_approvals: pendingApprovals.rows[0].count,
      todays_bookings: todaysBookings.rows[0].count,
      status_breakdown: statusBreakdown.rows[0],
    });
  } finally {
    client.release();
  }
});

export default router;
