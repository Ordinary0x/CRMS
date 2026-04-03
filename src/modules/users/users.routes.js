const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./users.controller");

const router = express.Router();

router.get("/me", authMiddleware, controller.getMe);
router.patch("/:id/role", authMiddleware, controller.updateRole);
router.patch("/:id/deactivate", authMiddleware, controller.deactivateUser);

module.exports = router;
