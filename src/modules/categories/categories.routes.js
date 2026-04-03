const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const controller = require("./categories.controller");

const router = express.Router();

router.get("/", authMiddleware, controller.listCategories);
router.post("/", authMiddleware, controller.createCategory);
router.patch("/:id", authMiddleware, controller.updateCategory);

module.exports = router;
