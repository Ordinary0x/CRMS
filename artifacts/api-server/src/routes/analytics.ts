import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";
import { checkRole } from "../middlewares/checkRole";

const router: IRouter = Router();

// GET /analytics/utilization — role-scoped
router.get("/analytics/utilization", verifyToken, async (req, res): Promise<void> => {
  if (!req.user || !["admin", "hod", "resource_manager"].includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden", code: "INSUFFICIENT_ROLE" });
    return;
  }

  const { category_id } = req.query;
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (category_id) { conditions.push(`r.category_id = $${idx++}`); params.push(Number(category_id)); }

    if (req.user.role === "resource_manager") {
      conditions.push(`r.manager_id = $${idx++}`);
      params.push(req.user.user_id);
    } else if (req.user.role === "hod") {
      if (!req.user.department_id) {
        res.status(400).json({ error: "HOD department is not configured" });
        return;
      }
      conditions.push(`r.department_id = $${idx++}`);
      params.push(req.user.department_id);
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const result = await client.query(
      `SELECT
       r.resource_id,
       r.resource_name,
       rc.category_name,
       mv.week_start,
       COALESCE(mv.total_bookings, 0)::INT as total_bookings,
       COALESCE(mv.booked_hours, 0)::FLOAT as booked_hours
       FROM resource r
       JOIN resource_category rc ON rc.category_id = r.category_id
       LEFT JOIN mv_resource_utilization mv ON mv.resource_id = r.resource_id
       WHERE 1=1 ${where}
       ORDER BY mv.week_start DESC NULLS LAST, booked_hours DESC`,
      params
    );

    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /analytics/busiest-resources — admin + rm scoped
router.get("/analytics/busiest-resources", verifyToken, async (req, res): Promise<void> => {
  if (!req.user || !["admin", "resource_manager", "hod"].includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden", code: "INSUFFICIENT_ROLE" });
    return;
  }

  const { days = "30" } = req.query;
  const daysNum = Math.max(1, Number(days) || 30);
  const client = await pool.connect();
  try {
    const conditions: string[] = ["b.date >= CURRENT_DATE - ($1::INT * INTERVAL '1 day')"];
    const params: unknown[] = [daysNum];
    let idx = 2;

    if (req.user.role === "resource_manager") {
      conditions.push(`r.manager_id = $${idx++}`);
      params.push(req.user.user_id);
    } else if (req.user.role === "hod") {
      if (!req.user.department_id) {
        res.status(400).json({ error: "HOD department is not configured" });
        return;
      }
      conditions.push(`r.department_id = $${idx++}`);
      params.push(req.user.department_id);
    }

    const result = await client.query(
      `SELECT
       r.resource_id,
       r.resource_name,
       rc.category_name,
       COUNT(*)::INT as total_bookings,
       COALESCE(SUM(EXTRACT(EPOCH FROM ((b.date::TIMESTAMP + b.end_time) - (b.date::TIMESTAMP + b.start_time))) / 3600.0), 0)::FLOAT as booked_hours
       FROM booking b
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       JOIN booking_status bs ON bs.status_id = b.status_id
       WHERE ${conditions.join(" AND ")}
         AND bs.status_name IN ('Approved','Completed')
       GROUP BY r.resource_id, r.resource_name, rc.category_name
       ORDER BY total_bookings DESC, booked_hours DESC
       LIMIT 10`,
      params
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /analytics/by-department — admin only
router.get("/analytics/by-department", verifyToken, checkRole("admin"), async (req, res): Promise<void> => {
  const { from, to } = req.query;
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (from) {
      conditions.push(`b.date >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`b.date <= $${idx++}`);
      params.push(to);
    }

    const bookingFilter = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const result = await client.query(
      `SELECT d.department_id, d.dept_name,
       COUNT(b.booking_id)::INT as total_bookings,
       COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Approved')::INT as approved_bookings,
       COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Rejected')::INT as rejected_bookings
       FROM department d
       LEFT JOIN users u ON u.department_id = d.department_id
       LEFT JOIN booking b ON b.user_id = u.user_id ${bookingFilter}
       LEFT JOIN booking_status bs ON bs.status_id = b.status_id
       GROUP BY d.department_id, d.dept_name
       ORDER BY total_bookings DESC`,
      params
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /analytics/approval-stats
router.get("/analytics/approval-stats", verifyToken, async (req, res): Promise<void> => {
  if (!req.user || !["admin", "hod", "resource_manager"].includes(req.user.role)) {
    res.status(403).json({ error: "Forbidden", code: "INSUFFICIENT_ROLE" });
    return;
  }

  const client = await pool.connect();
  try {
    const conditions: string[] = ["a.decision IS NOT NULL"];
    const params: unknown[] = [];
    let idx = 1;

    if (req.user.role === "resource_manager") {
      conditions.push(`r.manager_id = $${idx++}`);
      params.push(req.user.user_id);
    } else if (req.user.role === "hod") {
      if (!req.user.department_id) {
        res.status(400).json({ error: "HOD department is not configured" });
        return;
      }
      conditions.push(`r.department_id = $${idx++}`);
      params.push(req.user.department_id);
    }

    const result = await client.query(
      `SELECT
         COALESCE(AVG(EXTRACT(EPOCH FROM (a.approval_time - b.created_at))/3600.0) FILTER (WHERE a.step_number = 1), 0)::FLOAT as avg_step1_hours,
         COALESCE(AVG(EXTRACT(EPOCH FROM (a.approval_time - b.created_at))/3600.0) FILTER (WHERE a.step_number = 2), 0)::FLOAT as avg_step2_hours,
         COUNT(*) FILTER (WHERE a.decision = 'Approved')::INT as total_approved,
         COUNT(*) FILTER (WHERE a.decision = 'Rejected')::INT as total_rejected,
         COALESCE(
           (COUNT(*) FILTER (WHERE a.decision = 'Rejected')::FLOAT / NULLIF(COUNT(*), 0) * 100),
           0
         )::FLOAT as rejection_rate
       FROM approval a
       JOIN booking b ON b.booking_id = a.booking_id
       JOIN resource r ON r.resource_id = b.resource_id
       WHERE ${conditions.join(" AND ")}`,
      params
    );

    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

export default router;
