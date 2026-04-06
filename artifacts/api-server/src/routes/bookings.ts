import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { verifyToken } from "../middlewares/verifyToken";

const router: IRouter = Router();

const BOOKING_QUERY = `
  SELECT b.*, bs.status_name, r.resource_name, rc.category_name,
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
`;

// POST /bookings
router.post("/bookings", verifyToken, async (req, res): Promise<void> => {
  const { resource_id, date, start_time, end_time, purpose } = req.body;

  if (!resource_id || !date || !start_time || !end_time) {
    res.status(400).json({ error: "resource_id, date, start_time, end_time are required" });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT create_booking($1, $2, $3, $4, $5, $6) as booking_id",
      [req.user!.user_id, resource_id, date, start_time, end_time, purpose ?? null]
    );

    const booking_id = result.rows[0].booking_id;

    // Get booking status and approval steps
    const bookingResult = await client.query(
      `SELECT bs.status_name, COALESCE(r.approval_steps_override, rc.approval_steps) AS approval_steps
       FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       JOIN resource r ON r.resource_id = b.resource_id
       JOIN resource_category rc ON rc.category_id = r.category_id
       WHERE b.booking_id = $1`,
      [booking_id]
    );

    res.status(201).json({
      booking_id,
      status: bookingResult.rows[0].status_name,
      approval_steps: bookingResult.rows[0].approval_steps,
    });
  } catch (e: unknown) {
    const error = e as { message?: string; code?: string };
    if (error.message?.includes("CONFLICT")) {
      // Generate alternative slots
      const altClient = await pool.connect();
      try {
        const busyResult = await altClient.query(
          `SELECT start_time, end_time FROM booking
           WHERE resource_id = $1 AND date = $2
             AND status_id IN (SELECT status_id FROM booking_status WHERE status_name IN ('Pending','Approved'))
           ORDER BY start_time`,
          [resource_id, date]
        );

        const busySlots = busyResult.rows;
        const alternatives: { start_time: string; end_time: string }[] = [];
        const duration = timeDiff(start_time, end_time);
        const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

        for (const slot of slots) {
          const slotEnd = addHours(slot, duration);
          if (slotEnd > "20:00") break;
          const hasConflict = busySlots.some(
            (b) => b.start_time < slotEnd && b.end_time > slot
          );
          if (!hasConflict && alternatives.length < 3) {
            alternatives.push({ start_time: slot, end_time: slotEnd });
          }
        }

        res.status(409).json({
          message: "Resource already booked for that time slot",
          alternatives,
        });
      } finally {
        altClient.release();
      }
    } else if (error.message?.includes("blackout")) {
      res.status(400).json({ error: "Date falls within a blackout period" });
    } else if (error.message?.includes("maintenance")) {
      res.status(400).json({ error: "Resource is unavailable during maintenance window" });
    } else if (error.message?.includes("advance window")) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message || "Booking failed" });
    }
  } finally {
    client.release();
  }
});

function timeDiff(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// GET /bookings
router.get("/bookings", verifyToken, async (req, res): Promise<void> => {
  const { status, from_date, to_date } = req.query;
  const client = await pool.connect();
  try {
    const conditions: string[] = ["b.user_id = $1"];
    const params: unknown[] = [req.user!.user_id];
    let idx = 2;

    if (status) { conditions.push(`LOWER(bs.status_name) = LOWER($${idx++})`); params.push(status); }
    if (from_date) { conditions.push(`b.date >= $${idx++}`); params.push(from_date); }
    if (to_date) { conditions.push(`b.date <= $${idx++}`); params.push(to_date); }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const result = await client.query(
      `${BOOKING_QUERY} ${where} ORDER BY b.date DESC, b.start_time DESC`,
      params
    );
    res.json(result.rows);
  } finally {
    client.release();
  }
});

// GET /bookings/:id
router.get("/bookings/:id", verifyToken, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `${BOOKING_QUERY} WHERE b.booking_id = $1 AND b.user_id = $2`,
      [id, req.user!.user_id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

// PATCH /bookings/:id/cancel
router.patch("/bookings/:id/cancel", verifyToken, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const client = await pool.connect();
  try {
    const booking = await client.query(
      `SELECT b.*, bs.status_name FROM booking b
       JOIN booking_status bs ON bs.status_id = b.status_id
       WHERE b.booking_id = $1 AND b.user_id = $2`,
      [id, req.user!.user_id]
    );

    if (!booking.rows[0]) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const b = booking.rows[0];
    if (!["Pending", "Approved"].includes(b.status_name)) {
      res.status(400).json({ error: "Only Pending or Approved bookings can be cancelled" });
      return;
    }

    const bookingDatePart = String(b.date).slice(0, 10);
    const bookingStartPart = String(b.start_time).slice(0, 8);
    const startAt = new Date(`${bookingDatePart}T${bookingStartPart}`);
    if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
      res.status(400).json({ error: "Cannot cancel a booking that has already started" });
      return;
    }

    const cancelStatus = await client.query(
      "SELECT status_id FROM booking_status WHERE status_name = 'Cancelled'"
    );
    await client.query(
      "UPDATE booking SET status_id = $1 WHERE booking_id = $2",
      [cancelStatus.rows[0].status_id, id]
    );

    await client.query(
      "INSERT INTO notification(user_id, message, channel) VALUES ($1, $2, 'email')",
      [req.user!.user_id, `Your booking #${id} has been cancelled.`]
    );

    res.json({ message: "Booking cancelled" });
  } finally {
    client.release();
  }
});

export default router;
