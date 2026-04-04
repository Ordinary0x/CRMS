import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM notification WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.user_id]
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", verifyToken, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    await client.query(
      "UPDATE notification SET read_at = COALESCE(read_at, now()) WHERE notification_id = $1 AND user_id = $2",
      [id, req.user!.user_id]
    );
    res.json({ message: "Notification marked as read" });
  } finally {
    client.release();
  }
});

// PATCH /notifications/read-all
router.patch("/notifications/read-all", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query(
      "UPDATE notification SET read_at = COALESCE(read_at, now()) WHERE user_id = $1",
      [req.user!.user_id]
    );
    res.json({ message: "All notifications marked as read" });
  } finally {
    client.release();
  }
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*)::INT as count FROM notification WHERE user_id = $1 AND read_at IS NULL",
      [req.user!.user_id]
    );
    res.json({ count: result.rows[0].count });
  } finally {
    client.release();
  }
});

// Backward-compatible alias
router.get("/notifications/count", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*)::INT as count FROM notification WHERE user_id = $1 AND read_at IS NULL",
      [req.user!.user_id]
    );
    res.json({ count: result.rows[0].count });
  } finally {
    client.release();
  }
});

export default router;
