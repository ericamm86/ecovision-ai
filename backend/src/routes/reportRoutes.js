const express = require("express");
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, reportController.list);
router.get("/stats", authMiddleware, reportController.stats);
router.post("/", authMiddleware, reportController.create);
router.patch("/:id/status", authMiddleware, reportController.updateStatus);

module.exports = router;
