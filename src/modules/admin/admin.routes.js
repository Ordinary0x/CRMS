const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./admin.controller");

const router = express.Router();

router.get("/users", authMiddleware, controller.listUsers);
router.post("/blackout", authMiddleware, controller.createBlackout);
router.get("/blackout", authMiddleware, controller.listBlackouts);
router.delete("/blackout/:id", authMiddleware, controller.deleteBlackout);
router.post("/bookings/:id/override", authMiddleware, controller.overrideBooking);

module.exports = router;
