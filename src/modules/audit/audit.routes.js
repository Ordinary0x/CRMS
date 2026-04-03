const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./audit.controller");

const router = express.Router();

router.get("/", authMiddleware, controller.listAuditLogs);
router.get("/booking/:id", authMiddleware, controller.getBookingAuditTrail);

module.exports = router;
