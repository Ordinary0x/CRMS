import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";
import { checkRole } from "../middlewares/checkRole";

const router: IRouter = Router();
const adminAuth = [verifyToken, checkRole("admin")];

function priorityForRole(role: string): number {
  switch (role) {
    case "admin": return 1;
    case "hod":
    case "resource_manager": return 2;
    case "staff":
    case "faculty": return 3;
    default: return 4;
  }
}

// GET /admin/users
router.get("/admin/users", ...adminAuth, async (req, res): Promise<void> => {
  const { role, department_id, is_active, search, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
    if (department_id) { conditions.push(`u.department_id = $${idx++}`); params.push(Number(department_id)); }
    if (is_active !== undefined && is_active !== "") {
      conditions.push(`u.is_active = $${idx++}`);
      params.push(is_active === "true");
    }
    if (search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await client.query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await client.query(
      `SELECT u.*, d.dept_name as department_name
       FROM users u
       LEFT JOIN department d ON d.department_id = u.department_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitNum, offset]
    );

    res.json({ data: result.rows, total, page: pageNum, limit: limitNum });
  } finally {
    client.release();
  }
});

// PATCH /admin/users/:id/role
router.patch("/admin/users/:id/role", ...adminAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { role, is_active, department_id } = req.body;

  if (!role) {
    res.status(400).json({ error: "Role is required" });
    return;
  }

  const priority_level = priorityForRole(role);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE users SET role = $1, priority_level = $2, is_active = COALESCE($3, is_active),
       department_id = $4
       WHERE user_id = $5
       RETURNING *, (SELECT dept_name FROM department WHERE department_id = users.department_id) as department_name`,
      [role, priority_level, is_active, department_id ?? null, id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Send notification
    await client.query(
      "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
      [id, `Your role has been updated to ${role} and account is ${is_active ? "active" : "inactive"}.`]
    );

    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

// DELETE /admin/users/:id (soft delete)
router.delete("/admin/users/:id", ...adminAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    await client.query("UPDATE users SET is_active = false WHERE user_id = $1", [id]);
    res.json({ message: "User deactivated" });
  } finally {
    client.release();
  }
});

// GET /admin/departments
router.get("/admin/departments", ...adminAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT d.*, 
       CONCAT(u.first_name, ' ', u.last_name) as hod_name,
       (SELECT COUNT(*) FROM users WHERE department_id = d.department_id)::INT as user_count
       FROM department d
       LEFT JOIN users u ON u.user_id = d.hod_id
       ORDER BY d.dept_name`
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// POST /admin/departments
router.post("/admin/departments", ...adminAuth, async (req, res): Promise<void> => {
  const { dept_name, building, email, hod_id } = req.body;
  if (!dept_name) {
    res.status(400).json({ error: "Department name is required" });
    return;
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO department(dept_name, building, email, hod_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dept_name, building ?? null, email ?? null, hod_id ?? null]
    );
    const dept = result.rows[0];
    if (hod_id) {
      const hodResult = await client.query(
        "SELECT CONCAT(first_name, ' ', last_name) as hod_name FROM users WHERE user_id = $1",
        [hod_id]
      );
      dept.hod_name = hodResult.rows[0]?.hod_name ?? null;
    } else {
      dept.hod_name = null;
    }
    dept.user_count = 0;
    res.status(201).json(dept);
  } finally {
    client.release();
  }
});

// PATCH /admin/departments/:id
router.patch("/admin/departments/:id", ...adminAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { dept_name, building, email, hod_id } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE department SET dept_name = COALESCE($1, dept_name), building = $2, email = $3, hod_id = $4
       WHERE department_id = $5
       RETURNING *`,
      [dept_name, building ?? null, email ?? null, hod_id ?? null, id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Department not found" });
      return;
    }
    const dept = result.rows[0];
    const countResult = await client.query(
      "SELECT COUNT(*)::INT as user_count FROM users WHERE department_id = $1",
      [id]
    );
    dept.user_count = countResult.rows[0].user_count;
    if (hod_id) {
      const hodResult = await client.query(
        "SELECT CONCAT(first_name, ' ', last_name) as hod_name FROM users WHERE user_id = $1",
        [hod_id]
      );
      dept.hod_name = hodResult.rows[0]?.hod_name ?? null;
    }
    res.json(dept);
  } finally {
    client.release();
  }
});

// GET /admin/blackout
router.get("/admin/blackout", ...adminAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT bp.*, rc.category_name
       FROM blackout_period bp
       LEFT JOIN resource_category rc ON rc.category_id = bp.category_id
       ORDER BY bp.start_date DESC`
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// POST /admin/blackout
router.post("/admin/blackout", ...adminAuth, async (req, res): Promise<void> => {
  const { category_id, start_date, end_date, reason } = req.body;
  if (!start_date || !end_date) {
    res.status(400).json({ error: "start_date and end_date are required" });
    return;
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO blackout_period(category_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [category_id ?? null, start_date, end_date, reason ?? null]
    );
    const bp = result.rows[0];
    if (category_id) {
      const catResult = await client.query(
        "SELECT category_name FROM resource_category WHERE category_id = $1",
        [category_id]
      );
      bp.category_name = catResult.rows[0]?.category_name ?? null;
    }
    res.status(201).json(bp);
  } finally {
    client.release();
  }
});

// DELETE /admin/blackout/:id
router.delete("/admin/blackout/:id", ...adminAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM blackout_period WHERE blackout_id = $1", [id]);
    res.json({ message: "Blackout period deleted" });
  } finally {
    client.release();
  }
});

// GET /admin/audit-log
router.get("/admin/audit-log", ...adminAuth, async (req, res): Promise<void> => {
  const { table_name, operation, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (table_name) { conditions.push(`al.table_name = $${idx++}`); params.push(table_name); }
    if (operation) { conditions.push(`al.operation = $${idx++}`); params.push(operation); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await client.query(`SELECT COUNT(*) FROM audit_log al ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await client.query(
      `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
       FROM audit_log al
       LEFT JOIN users u ON u.user_id = al.changed_by
       ${where}
       ORDER BY al.changed_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitNum, offset]
    );

    res.json({ data: result.rows, total, page: pageNum, limit: limitNum });
  } finally {
    client.release();
  }
});

// GET /admin/bookings
router.get("/admin/bookings", ...adminAuth, async (req, res): Promise<void> => {
  const { status, resource_id, user_id, from_date, to_date, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (status) { conditions.push(`bs.status_name = $${idx++}`); params.push(status); }
    if (resource_id) { conditions.push(`b.resource_id = $${idx++}`); params.push(Number(resource_id)); }
    if (user_id) { conditions.push(`b.user_id = $${idx++}`); params.push(Number(user_id)); }
    if (from_date) { conditions.push(`b.date >= $${idx++}`); params.push(from_date); }
    if (to_date) { conditions.push(`b.date <= $${idx++}`); params.push(to_date); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await client.query(
      `SELECT COUNT(*) FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await client.query(
      `SELECT b.*, bs.status_name, r.resource_name, rc.category_name,
       CONCAT(u.first_name, ' ', u.last_name) as user_name,
       COALESCE(
         (SELECT json_agg(json_build_object(
           'approval_id', a.approval_id,
           'step_number', a.step_number,
           'decision', a.decision,
           'approver_name', CONCAT(au.first_name, ' ', au.last_name),
           'remarks', a.remarks,
           'approval_time', a.approval_time
         ) ORDER BY a.step_number)
          FROM approval a
          LEFT JOIN users au ON au.user_id = a.approver_id
          WHERE a.booking_id = b.booking_id
         ), '[]'::json
       ) as approvals
       FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       JOIN users u ON u.user_id = b.user_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitNum, offset]
    );

    res.json({ data: result.rows, total, page: pageNum, limit: limitNum });
  } finally {
    client.release();
  }
});

// PATCH /admin/bookings/:id/cancel
router.patch("/admin/bookings/:id/cancel", ...adminAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    const cancelStatus = await client.query(
      "SELECT status_id FROM booking_status WHERE status_name = 'Cancelled'"
    );
    await client.query(
      "UPDATE booking SET status_id = $1 WHERE booking_id = $2",
      [cancelStatus.rows[0].status_id, id]
    );
    res.json({ message: "Booking cancelled" });
  } finally {
    client.release();
  }
});

// GET /admin/dashboard
router.get("/admin/dashboard", ...adminAuth, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const [users, resources, bookingsToday, pendingApprovals, recentAudit, busiest] = await Promise.all([
      client.query("SELECT COUNT(*)::INT as count FROM users WHERE is_active = true"),
      client.query("SELECT COUNT(*)::INT as count FROM resource WHERE status = 'active'"),
      client.query("SELECT COUNT(*)::INT as count FROM booking WHERE date = CURRENT_DATE"),
      client.query(
        `SELECT COUNT(*)::INT as count FROM approval a
         JOIN booking b ON b.booking_id = a.booking_id
         JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name = 'Pending'
         WHERE a.decision IS NULL`
      ),
      client.query(
        `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
         FROM audit_log al LEFT JOIN users u ON u.user_id = al.changed_by
         ORDER BY al.changed_at DESC LIMIT 20`
      ),
      client.query(
        `SELECT r.resource_id, r.resource_name, rc.category_name,
         COUNT(b.booking_id)::INT as total_bookings,
         COALESCE(SUM(EXTRACT(EPOCH FROM ((b.date::TIMESTAMP + b.end_time) - (b.date::TIMESTAMP + b.start_time))) / 3600.0), 0) as booked_hours
         FROM resource r
         JOIN resource_category rc ON rc.category_id = r.category_id
         LEFT JOIN booking b ON b.resource_id = r.resource_id
           AND b.date >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY r.resource_id, r.resource_name, rc.category_name
         ORDER BY total_bookings DESC
         LIMIT 5`
      ),
    ]);

    res.json({
      total_users: users.rows[0].count,
      total_resources: resources.rows[0].count,
      bookings_today: bookingsToday.rows[0].count,
      pending_approvals: pendingApprovals.rows[0].count,
      recent_audit_log: recentAudit.rows,
      busiest_resources: busiest.rows,
    });
  } finally {
    client.release();
  }
});

export default router;
