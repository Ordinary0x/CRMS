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
      "UPDATE notification SET is_read = true WHERE notif_id = $1 AND user_id = $2",
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
      "UPDATE notification SET is_read = true WHERE user_id = $1",
      [req.user!.user_id]
    );
    res.json({ message: "All notifications marked as read" });
  } finally {
    client.release();
  }
});

// GET /notifications/count
router.get("/notifications/count", verifyToken, async (req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*)::INT as unread FROM notification WHERE user_id = $1 AND is_read = false",
      [req.user!.user_id]
    );
    res.json({ unread: result.rows[0].unread });
  } finally {
    client.release();
  }
});

export default router;
