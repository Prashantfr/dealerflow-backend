const express = require("express");

const asyncHandler = require("../middleware/asyncHandler");
const { loginLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

const { loginUser } = require("../controllers/authController");

router.post("/login", loginLimiter, asyncHandler(loginUser));

module.exports = router;