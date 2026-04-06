import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyTokenAllowInactive, JWT_SECRET } from "../middlewares/verifyToken";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// POST /auth/login — authenticate with email + password, return JWT
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { uid: user.firebase_uid, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        role: user.role,
        is_active: user.is_active,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      }
    });
  } finally {
    client.release();
  }
});

// POST /auth/register — create user row, return JWT
router.post("/auth/register", async (req, res): Promise<void> => {
  const { first_name, last_name, email, password, firebase_uid } = req.body;

  if (!email || !first_name || !last_name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

    if (!password && !firebase_uid) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

  const client = await pool.connect();
  try {
    const uid = firebase_uid || randomUUID();

    // Check if user already exists by email
    const existing = await client.query(
      "SELECT user_id, role, is_active, firebase_uid FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows[0]) {
      let uidForToken = existing.rows[0].firebase_uid as string;

      if (firebase_uid && firebase_uid !== uidForToken) {
        const uidAlreadyUsed = await client.query(
          "SELECT user_id FROM users WHERE firebase_uid = $1",
          [firebase_uid],
        );

        if (!uidAlreadyUsed.rows[0]) {
          await client.query(
            "UPDATE users SET firebase_uid = $1 WHERE user_id = $2",
            [firebase_uid, existing.rows[0].user_id],
          );
          uidForToken = firebase_uid;
        }
      }

      const token = jwt.sign(
        { uid: uidForToken, email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json({
        token,
        user_id: existing.rows[0].user_id,
        role: existing.rows[0].role,
        is_active: existing.rows[0].is_active,
        email,
      });
      return;
    }

    // Also check by firebase_uid if provided
    if (firebase_uid) {
      const byUid = await client.query(
        "SELECT user_id, role, is_active FROM users WHERE firebase_uid = $1",
        [firebase_uid]
      );
      if (byUid.rows[0]) {
        const token = jwt.sign(
          { uid: firebase_uid, email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        res.json({
          token,
          user_id: byUid.rows[0].user_id,
          role: byUid.rows[0].role,
          is_active: byUid.rows[0].is_active,
          email,
        });
        return;
      }
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : null;

    const result = await client.query(
      `INSERT INTO users(firebase_uid, first_name, last_name, email, role, is_active, priority_level, password_hash)
       VALUES ($1, $2, $3, $4, 'student', true, 4, $5)
       RETURNING user_id, role, is_active`,
      [uid, first_name, last_name, email, password_hash]
    );

    const token = jwt.sign(
      { uid, email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user_id: result.rows[0].user_id,
      role: result.rows[0].role,
      is_active: result.rows[0].is_active,
      email,
    });
  } finally {
    client.release();
  }
});

// GET /auth/me — get current user profile (allows inactive accounts)
router.get("/auth/me", verifyTokenAllowInactive, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.user_id, u.firebase_uid, u.first_name, u.last_name, u.email,
              u.phone, u.role, u.is_active, u.priority_level, u.department_id,
              u.created_at, d.dept_name as department_name
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
