import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";
import { checkRole } from "../middlewares/checkRole";

const router: IRouter = Router();

// GET /analytics/utilization — admin only
router.get("/analytics/utilization", verifyToken, checkRole("admin"), async (req, res): Promise<void> => {
  const { from_date, to_date, category_id } = req.query;
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (from_date) { conditions.push(`b.date >= $${idx++}`); params.push(from_date); }
    if (to_date) { conditions.push(`b.date <= $${idx++}`); params.push(to_date); }
    if (category_id) { conditions.push(`r.category_id = $${idx++}`); params.push(Number(category_id)); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await client.query(
      `SELECT r.resource_id, r.resource_name, rc.category_name,
       COUNT(b.booking_id)::INT as total_bookings,
       COALESCE(SUM(EXTRACT(EPOCH FROM ((b.date::TIMESTAMP + b.end_time) - (b.date::TIMESTAMP + b.start_time))) / 3600.0), 0) as booked_hours,
       COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Approved')::INT as approved,
       COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Rejected')::INT as rejected,
       COUNT(b.booking_id) FILTER (WHERE bs.status_name = 'Cancelled')::INT as cancelled
       FROM resource r
       JOIN resource_category rc ON rc.category_id = r.category_id
       LEFT JOIN booking b ON b.resource_id = r.resource_id
       LEFT JOIN booking_status bs ON bs.status_id = b.status_id
       ${where}
       GROUP BY r.resource_id, r.resource_name, rc.category_name
       ORDER BY booked_hours DESC`,
      params
    );

    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /analytics/booking-trends — admin only
router.get("/analytics/booking-trends", verifyToken, checkRole("admin"), async (req, res): Promise<void> => {
  const { granularity = "week" } = req.query;
  const client = await pool.connect();
  try {
    const trunc = granularity === "month" ? "month" : "week";
    const result = await client.query(
      `SELECT DATE_TRUNC('${trunc}', b.date::TIMESTAMP) as period,
       COUNT(*)::INT as total_bookings,
       COUNT(*) FILTER (WHERE bs.status_name = 'Approved')::INT as approved,
       COUNT(*) FILTER (WHERE bs.status_name = 'Rejected')::INT as rejected,
       COUNT(*) FILTER (WHERE bs.status_name = 'Cancelled')::INT as cancelled
       FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       WHERE b.date >= CURRENT_DATE - INTERVAL '3 months'
       GROUP BY period
       ORDER BY period ASC`
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /analytics/department-usage — admin only
router.get("/analytics/department-usage", verifyToken, checkRole("admin"), async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT d.department_id, d.dept_name,
       COUNT(b.booking_id)::INT as total_bookings,
       COALESCE(SUM(EXTRACT(EPOCH FROM ((b.date::TIMESTAMP + b.end_time) - (b.date::TIMESTAMP + b.start_time))) / 3600.0), 0) as booked_hours
       FROM department d
       LEFT JOIN users u ON u.department_id = d.department_id
       LEFT JOIN booking b ON b.user_id = u.user_id
       GROUP BY d.department_id, d.dept_name
       ORDER BY total_bookings DESC`
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

export default router;
