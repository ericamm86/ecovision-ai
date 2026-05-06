const express = require("express");
const analysisController = require("../controllers/analysisController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, analysisController.analyze);

module.exports = router;
