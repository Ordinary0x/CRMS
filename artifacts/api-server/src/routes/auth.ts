import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";

const router: IRouter = Router();

// POST /auth/register — create user row if not exists
router.post("/auth/register", async (req, res): Promise<void> => {
  const { first_name, last_name, email, firebase_uid } = req.body;

  if (!firebase_uid || !email || !first_name || !last_name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const client = await pool.connect();
  try {
    // Check if user already exists
    const existing = await client.query(
      "SELECT user_id, role, is_active FROM users WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (existing.rows[0]) {
      res.json({
        user_id: existing.rows[0].user_id,
        role: existing.rows[0].role,
        is_active: existing.rows[0].is_active,
        email,
      });
      return;
    }

    // Also check by email
    const byEmail = await client.query(
      "SELECT user_id, role, is_active FROM users WHERE email = $1",
      [email]
    );

    if (byEmail.rows[0]) {
      // Update firebase_uid if missing
      await client.query(
        "UPDATE users SET firebase_uid = $1 WHERE email = $2",
        [firebase_uid, email]
      );
      res.json({
        user_id: byEmail.rows[0].user_id,
        role: byEmail.rows[0].role,
        is_active: byEmail.rows[0].is_active,
        email,
      });
      return;
    }

    // Create new user
    const result = await client.query(
      `INSERT INTO users(firebase_uid, first_name, last_name, email, role, is_active, priority_level)
       VALUES ($1, $2, $3, $4, 'student', false, 4)
       RETURNING user_id, role, is_active`,
      [firebase_uid, first_name, last_name, email]
    );

    res.status(201).json({
      user_id: result.rows[0].user_id,
      role: result.rows[0].role,
      is_active: result.rows[0].is_active,
      email,
    });
  } finally {
    client.release();
  }
});

// GET /auth/me — get current user profile
router.get("/auth/me", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.*, d.dept_name as department_name
       FROM users u
       LEFT JOIN department d ON d.department_id = u.department_id
       WHERE u.user_id = $1`,
      [req.user!.user_id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

export default router;
