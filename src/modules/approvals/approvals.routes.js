const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./approvals.controller");

const router = express.Router();

router.get("/pending", authMiddleware, controller.listPendingApprovals);
router.post("/:id/step1", authMiddleware, controller.stepOneDecision);
router.post("/:id/step2", authMiddleware, controller.stepTwoDecision);

module.exports = router;
