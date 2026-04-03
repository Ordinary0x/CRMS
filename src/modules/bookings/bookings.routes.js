const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./bookings.controller");

const router = express.Router();

router.post("/", authMiddleware, controller.createBooking);
router.get("/", authMiddleware, controller.listBookings);
router.get("/conflicts", authMiddleware, controller.getConflicts);
router.get("/:id", authMiddleware, controller.getBookingById);
router.delete("/:id", authMiddleware, controller.cancelBooking);

module.exports = router;
