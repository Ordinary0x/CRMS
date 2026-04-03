const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./notifications.controller");

const router = express.Router();

router.get("/", authMiddleware, controller.listNotifications);
router.patch("/:id/read", authMiddleware, controller.markAsRead);

module.exports = router;
