const express = require("express");
const cors = require("cors");

const { apiPrefix } = require("./config/env");
const rateLimitMiddleware = require("./middlewares/rate-limit.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const resourceRoutes = require("./modules/resources/resources.routes");
const bookingRoutes = require("./modules/bookings/bookings.routes");
const approvalRoutes = require("./modules/approvals/approvals.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const notificationRoutes = require("./modules/notifications/notifications.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const categoryRoutes = require("./modules/categories/categories.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(rateLimitMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/resources`, resourceRoutes);
app.use(`${apiPrefix}/bookings`, bookingRoutes);
app.use(`${apiPrefix}/approvals`, approvalRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/audit`, auditRoutes);
app.use(`${apiPrefix}/categories`, categoryRoutes);

app.use(errorMiddleware);

module.exports = app;
