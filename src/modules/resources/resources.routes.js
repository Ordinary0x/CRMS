const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./resources.controller");

const router = express.Router();

router.get("/", authMiddleware, controller.listResources);
router.post("/", authMiddleware, controller.createResource);
router.get("/:id", authMiddleware, controller.getResourceById);
router.patch("/:id", authMiddleware, controller.updateResource);
router.get("/:id/slots", authMiddleware, controller.getResourceSlots);
router.post("/:id/unavailability", authMiddleware, controller.createUnavailability);

module.exports = router;
