import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";
import { checkRole } from "../middlewares/checkRole";

const router: IRouter = Router();
const hodAuth = [verifyToken, checkRole("hod")];

const ALLOWED_HOD_ROLES = ["staff", "faculty", "resource_manager"];

// GET /hod/users
router.get("/hod/users", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.*, d.dept_name as department_name
       FROM users u
       LEFT JOIN department d ON d.department_id = u.department_id
       WHERE u.department_id = $1
       ORDER BY u.is_active ASC, u.created_at DESC`,
      [deptId]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// PATCH /hod/users/:id/activate
router.patch("/hod/users/:id/activate", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { role } = req.body;

  if (!role || !ALLOWED_HOD_ROLES.includes(role)) {
    res.status(400).json({ error: `Role must be one of: ${ALLOWED_HOD_ROLES.join(", ")}` });
    return;
  }

  const priorityMap: Record<string, number> = {
    staff: 3, faculty: 3, resource_manager: 2,
  };
  const priority_level = priorityMap[role];

  const client = await pool.connect();
  try {
    // Check user is in HOD's department
    const userCheck = await client.query(
      "SELECT department_id FROM users WHERE user_id = $1",
      [id]
    );
    if (!userCheck.rows[0] || userCheck.rows[0].department_id !== deptId) {
      res.status(403).json({ error: "User not in your department" });
      return;
    }

    const result = await client.query(
      `UPDATE users SET role = $1, is_active = true, priority_level = $2
       WHERE user_id = $3
       RETURNING *`,
      [role, priority_level, id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Notify user
    await client.query(
      "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
      [id, `Your account has been activated with role: ${role}.`]
    );

    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

// GET /hod/approvals/pending
router.get("/hod/approvals/pending", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT a.*, b.date, b.start_time, b.end_time, b.purpose, b.priority_level, b.created_at,
       r.resource_name, rc.category_name,
       CONCAT(u.first_name, ' ', u.last_name) as requester_name,
       u.email as requester_email,
       (SELECT CONCAT(au.first_name, ' ', au.last_name) FROM approval a2 JOIN users au ON au.user_id = a2.approver_id
        WHERE a2.booking_id = b.booking_id AND a2.step_number = 1 AND a2.decision = 'Approved') as step1_approved_by
       FROM approval a
       JOIN booking b ON b.booking_id = a.booking_id
       JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name = 'Pending'
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       JOIN users u ON u.user_id = b.user_id
       WHERE a.step_number = 2
          AND a.decision IS NULL
          AND r.department_id = $1
        ORDER BY b.created_at ASC`,
      [deptId]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// POST /hod/approvals/:id/decide
router.post("/hod/approvals/:id/decide", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

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
      `SELECT a.*, b.user_id
       FROM approval a
       JOIN booking b ON b.booking_id = a.booking_id
       JOIN resource r ON r.resource_id = b.resource_id
       WHERE a.approval_id = $1
         AND a.step_number = 2
         AND a.decision IS NULL
         AND r.department_id = $2`,
      [id, deptId]
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

    // Update booking status
    const newStatus = decisionValue === "Approved" ? "Approved" : "Rejected";
    const statusResult = await client.query(
      "SELECT status_id FROM booking_status WHERE status_name = $1",
      [newStatus]
    );
    await client.query(
      "UPDATE booking SET status_id = $1 WHERE booking_id = $2",
      [statusResult.rows[0].status_id, approval.booking_id]
    );

    // Notify requester
    await client.query(
      "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
      [approval.user_id, `Your booking #${approval.booking_id} has been ${newStatus} by the HOD.`]
    );

    res.json({ message: `Booking ${newStatus}` });
  } finally {
    client.release();
  }
});

// GET /hod/bookings
router.get("/hod/bookings", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT b.*, bs.status_name, r.resource_name, rc.category_name,
       CONCAT(u.first_name, ' ', u.last_name) as user_name,
       COALESCE(
         (SELECT json_agg(json_build_object(
           'approval_id', a.approval_id, 'step_number', a.step_number,
           'decision', a.decision, 'approver_name', CONCAT(au.first_name, ' ', au.last_name),
           'remarks', a.remarks, 'approval_time', a.approval_time
         ) ORDER BY a.step_number)
          FROM approval a LEFT JOIN users au ON au.user_id = a.approver_id
          WHERE a.booking_id = b.booking_id
         ), '[]'::json
       ) as approvals
       FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       JOIN users u ON u.user_id = b.user_id
       WHERE u.department_id = $1
       ORDER BY b.created_at DESC`,
      [deptId]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /hod/analytics
router.get("/hod/analytics", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

  const client = await pool.connect();
  try {
    const stats = await client.query(
      `SELECT
       COUNT(*)::INT as total_bookings,
       COUNT(*) FILTER (WHERE bs.status_name = 'Pending')::INT as pending_bookings,
       COUNT(*) FILTER (WHERE bs.status_name = 'Approved')::INT as approved_bookings,
       COUNT(*) FILTER (WHERE bs.status_name = 'Rejected')::INT as rejected_bookings,
       COUNT(*) FILTER (WHERE bs.status_name = 'Cancelled')::INT as cancelled_bookings
       FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       JOIN users u ON u.user_id = b.user_id
       WHERE u.department_id = $1`,
      [deptId]
    );

    const byResource = await client.query(
      `SELECT r.resource_id, r.resource_name, rc.category_name,
       COUNT(b.booking_id)::INT as total_bookings,
       COALESCE(SUM(EXTRACT(EPOCH FROM ((b.date::TIMESTAMP + b.end_time) - (b.date::TIMESTAMP + b.start_time))) / 3600.0), 0) as booked_hours
       FROM booking b
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       JOIN users u ON u.user_id = b.user_id
       WHERE u.department_id = $1
       GROUP BY r.resource_id, r.resource_name, rc.category_name
       ORDER BY total_bookings DESC`,
      [deptId]
    );

    res.json({ ...stats.rows[0], utilization_by_resource: byResource.rows });
  } finally {
    client.release();
  }
});

// GET /hod/dashboard
router.get("/hod/dashboard", ...hodAuth, async (req, res): Promise<void> => {
  const deptId = req.user!.department_id;
  if (!deptId) {
    res.status(400).json({ error: "HOD department is not configured" });
    return;
  }

  const client = await pool.connect();
  try {
    const [users, pendingApprovals, bookingsToday, recentApprovals, roleBreakdown, recentDepartmentActivity] = await Promise.all([
      client.query(
        `SELECT
         COUNT(*)::INT as total,
         COUNT(*) FILTER (WHERE is_active = true)::INT as active,
         COUNT(*) FILTER (WHERE is_active = false)::INT as inactive
         FROM users WHERE department_id = $1`,
        [deptId]
      ),
      client.query(
        `SELECT COUNT(*)::INT as count FROM approval a
         JOIN booking b ON b.booking_id = a.booking_id
         JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name = 'Pending'
         JOIN resource r ON r.resource_id = b.resource_id
         WHERE a.step_number = 2 AND a.decision IS NULL
           AND r.department_id = $1`,
        [deptId]
      ),
      client.query(
        `SELECT COUNT(*)::INT as count FROM booking b
         JOIN users u ON u.user_id = b.user_id
         WHERE b.date = CURRENT_DATE AND u.department_id = $1`,
        [deptId]
      ),
      client.query(
        `SELECT a.approval_id, b.booking_id, b.date, b.start_time, b.end_time, b.purpose,
         r.resource_name, CONCAT(u.first_name, ' ', u.last_name) as requester_name
         FROM approval a
         JOIN booking b ON b.booking_id = a.booking_id
         JOIN booking_status bs ON bs.status_id = b.status_id AND bs.status_name = 'Pending'
         JOIN resource r ON r.resource_id = b.resource_id
         JOIN users u ON u.user_id = b.user_id
         WHERE a.step_number = 2 AND a.decision IS NULL
           AND r.department_id = $1
          ORDER BY b.created_at ASC LIMIT 5`,
        [deptId]
      ),
      client.query(
        `SELECT role,
         COUNT(*) FILTER (WHERE is_active = true)::INT as active_count,
         COUNT(*) FILTER (WHERE is_active = false)::INT as inactive_count
         FROM users
         WHERE department_id = $1
         GROUP BY role
         ORDER BY role`,
        [deptId]
      ),
      client.query(
        `SELECT b.booking_id, bs.status_name, r.resource_name, b.created_at,
         CONCAT(u.first_name, ' ', u.last_name) as requested_by
         FROM booking b
         JOIN booking_status bs ON bs.status_id = b.status_id
         JOIN resource r ON r.resource_id = b.resource_id
         JOIN users u ON u.user_id = b.user_id
         WHERE u.department_id = $1
         ORDER BY b.created_at DESC
         LIMIT 8`,
        [deptId]
      ),
    ]);

    res.json({
      dept_users: users.rows[0].active,
      dept_users_total: users.rows[0].total,
      dept_users_inactive: users.rows[0].inactive,
      pending_approvals: pendingApprovals.rows[0].count,
      bookings_today: bookingsToday.rows[0].count,
      recent_pending: recentApprovals.rows,
      role_breakdown: roleBreakdown.rows,
      recent_department_activity: recentDepartmentActivity.rows,
    });
  } finally {
    client.release();
  }
});

export default router;
