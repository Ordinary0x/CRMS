const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const dotenv = require('dotenv');
const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

// 🔹 Connect to PostgreSQL
const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});


// 🔹 Insert User
app.post("/addUser", async (req, res) => {
  const { user_id, f_name, l_name, email, phone, firebase_uid, role, dept_id, is_active } = req.body;

  try {
    await pool.query(
      `INSERT INTO users 
      (user_id, f_name, l_name, email, phone, firebase_uid, role, dept_id,is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [user_id, f_name, l_name, email, phone, firebase_uid, role, dept_id,is_active]
    );

    res.send("User inserted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 🔹 Insert Booking
app.post("/addbooking", async (req, res) => {
  const { booking_id, start_time, end_time, date, purpose, u_id, r_id, booking_status_id,prior_id,recurr_id } = req.body;

  try {
    await pool.query(
      `INSERT INTO booking 
      (booking_id, start_time, end_time, date, purpose, u_id, r_id, booking_status_id,prior_id,recurr_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [booking_id, start_time, end_time, date, purpose, u_id, r_id,booking_status_id,prior_id,recurr_id]
    );

    res.send("Booking created");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/addResource", async (req, res) => {
  const { resource_id, resource_name, capacity, status, location, c_id } = req.body;

  try {
    await pool.query(
      `INSERT INTO resource 
      (resource_id, resource_name, capacity, status, location, is_active, c_id)
      VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [resource_id, resource_name, capacity, status, location, c_id]
    );

    res.send("Resource added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addDepartment", async (req, res) => {
  const { department_id, dept_name, email, building } = req.body;

  try {
    await pool.query(
      `INSERT INTO department VALUES ($1,$2,$3,$4)`,
      [department_id, dept_name, email, building]
    );

    res.send("Department added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addCategory", async (req, res) => {
  const { category_id, category_name } = req.body;

  await pool.query(
    `INSERT INTO resource_category VALUES ($1,$2)`,
    [category_id, category_name]
  );

  res.send("Category added");
});

app.post("/addPriority", async (req, res) => {
  const { priority_id, priority_level, description } = req.body;

  try {
    await pool.query(
      `INSERT INTO priority VALUES ($1,$2,$3)`,
      [priority_id, priority_level, description]
    );

    res.send("Priority added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addStatus", async (req, res) => {
  const { status_id, status_name } = req.body;

  try {
    await pool.query(
      `INSERT INTO booking_status VALUES ($1,$2)`,
      [status_id, status_name]
    );

    res.send("Status added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addRecurrence", async (req, res) => {
  const { recurrence_id, pattern } = req.body;

  try {
    await pool.query(
      `INSERT INTO recurrence VALUES ($1,$2)`,
      [recurrence_id, pattern]
    );

    res.send("Recurrence added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addApproval", async (req, res) => {
  const { approval_id, u_id, decision, remarks, step_number, b_id } = req.body;

  try {
    await pool.query(
      `INSERT INTO approval 
      (approval_id, u_id, decision, remarks, step_number, b_id)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [approval_id, u_id, decision, remarks, step_number, b_id]
    );

    res.send("Approval added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addLog", async (req, res) => {
  const { log_id, check_in_time, check_out_time, u_id, b_id } = req.body;

  try {
    await pool.query(
      `INSERT INTO log VALUES ($1,$2,$3,$4,$5)`,
      [log_id, check_in_time, check_out_time, u_id, b_id]
    );

    res.send("Log added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addNotification", async (req, res) => {
  const { notification_id, u_id, message, status } = req.body;

  try {
    await pool.query(
      `INSERT INTO notification 
      (notification_id, u_id, message, status)
      VALUES ($1,$2,$3,$4)`,
      [notification_id, u_id, message, status]
    );

    res.send("Notification added ✅");
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/addAudit", async (req, res) => {
  const { audit_id, new_data, operation, description } = req.body;

  try {
    await pool.query(
      `INSERT INTO audit_log VALUES ($1,$2,$3,$4)`,
      [audit_id, new_data, operation, description]
    );

    res.send("Audit log added ✅");
  } catch (err) {
    res.send(err.message);
  }
});
app.get("/getresources", async (req, res) => {
  const result = await pool.query("SELECT * FROM resource");
  res.json(result.rows);
});

app.get("/getusers", async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});

app.get("/getdepartments", async (req, res) => {
  const result = await pool.query("SELECT * FROM department");
  res.json(result.rows);
});

app.get("/getbooking", async (req, res) => {
  const result = await pool.query("SELECT * FROM booking");
  res.json(result.rows);
});

app.get("/getcategory", async (req, res) => {
  const result = await pool.query("SELECT * FROM resource_category");
  res.json(result.rows);
});

app.get("/getstatus", async (req, res) => {
  const result = await pool.query("SELECT * FROM booking_status");
  res.json(result.rows);
});

app.get("/getpriority", async (req, res) => {
  const result = await pool.query("SELECT * FROM priority");
  res.json(result.rows);
});

app.get("/getapproval", async (req, res) => {
  const result = await pool.query("SELECT * FROM approval");
  res.json(result.rows);
});

app.get("/getlog", async (req, res) => {
  const result = await pool.query("SELECT * FROM log");
  res.json(result.rows);
});

app.get("/getnotification", async (req, res) => {
  const result = await pool.query("SELECT * FROM notification");
  res.json(result.rows);
});

app.get("/getauditlog", async (req, res) => {
  const result = await pool.query("SELECT * FROM audit_log");
  res.json(result.rows);
});

app.get("/getrecurrence", async (req, res) => {
  const result = await pool.query("SELECT * FROM recurrence");
  res.json(result.rows);
});

app.get("/allBookings", async (req, res) => {
  const result = await pool.query(`
    SELECT 
      b.booking_id,
      u.f_name,
      r.resource_name,
      b.date,
      b.start_time,
      b.end_time
    FROM booking b
    JOIN users u ON b.u_id = u.user_id
    JOIN resource r ON b.r_id = r.resource_id
  `);

  res.json(result.rows);
});

//Gel all active Resources
app.get("/resources", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.resource_id, r.resource_name, r.capacity, r.location, r.status, rc.category_name
      FROM resource r
      JOIN resource_category rc ON r.c_id = rc.category_id
      WHERE r.is_active = TRUE
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

//filter
app.get("/resources/filter", async (req, res) => {
  const { type, status, search } = req.query;

  try {
    const result = await pool.query(
      `SELECT r.*, rc.category_name
       FROM resource r
       JOIN resource_category rc ON r.c_id = rc.category_id
       WHERE ($1::text IS NULL OR rc.category_name = $1)
       AND ($2::text IS NULL OR r.status = $2)
       AND ($3::text IS NULL OR r.resource_name ILIKE '%' || $3 || '%')`,
      [type || null, status || null, search || null]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});
//available resources 
app.get("/resources/available", async (req, res) => {
  const { date, start, end } = req.query;

  try {
    const result = await pool.query(
      `SELECT *
       FROM resource r
       WHERE r.resource_id NOT IN (
         SELECT b.r_id
         FROM booking b
         WHERE b.date = $1
         AND (($2 BETWEEN b.start_time AND b.end_time)
         OR ($3 BETWEEN b.start_time AND b.end_time))
       )`,
      [date, start, end]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// booking (admin)
app.get("/bookings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.booking_id, u.name, r.resource_name,
             b.date, b.start_time, b.end_time, bs.status_name
      FROM booking b
      JOIN user u ON b.u_id = u.user_id
      JOIN resource r ON b.r_id = r.resource_id
      JOIN booking_status bs ON b.booking_status_id = bs.status_id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});
//update booking status
app.put("/bookings/:id/status", async (req, res) => {
  const bookingId = req.params.id;
  const { status_id } = req.body;

  try {
    await pool.query(
      `UPDATE booking SET booking_status_id = $1 WHERE booking_id = $2`,
      [status_id, bookingId]
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json(err.message);
  }
});
//cancel booking
app.put("/bookings/:id/cancel", async (req, res) => {
  const bookingId = req.params.id;

  try {
    await pool.query(
      `UPDATE booking SET booking_status_id = 5 WHERE booking_id = $1`,
      [bookingId]
    );

    res.json({ message: "Booking cancelled" });
  } catch (err) {
    res.status(500).json(err.message);
  }
});
//delete resource
app.delete("/resources/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query(`DELETE FROM resource WHERE resource_id = $1`, [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json(err.message);
  }
});
//dashboard
app.get("/dashboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE booking_status_id = 1) AS pending,
        COUNT(*) FILTER (WHERE booking_status_id = 2) AS approved,
        COUNT(*) FILTER (WHERE booking_status_id = 3) AS rejected,
        COUNT(*) AS total
      FROM booking
    `);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

app.get("/notifications/:user_id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notification WHERE u_id = $1`,
      [req.params.user_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

app.get("/approvals", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, b.booking_id, r.resource_name
      FROM approval a
      JOIN booking b ON a.b_id = b.booking_id
      JOIN resource r ON b.r_id = r.resource_id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});
//confilcts check
app.post("/bookings/check", async (req, res) => {
  const { resource_id, date, start_time, end_time } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM booking
       WHERE r_id = $1 AND date = $2
       AND ($3 < end_time AND $4 > start_time)`,
      [resource_id, date, start_time, end_time]
    );

    res.json({ conflict: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json(err.message);
  }
});
app.listen(3000, () => {
  console.log("Server running on port 3000");
});