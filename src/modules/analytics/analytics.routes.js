const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./analytics.controller");

const router = express.Router();

router.get("/utilization", authMiddleware, controller.getUtilization);
router.get("/bookings", authMiddleware, controller.getBookingAnalytics);
router.get("/departments", authMiddleware, controller.getDepartmentAnalytics);
router.get("/export", authMiddleware, controller.exportAnalytics);

module.exports = router;
