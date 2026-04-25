const express = require("express");
const Joi = require("joi");
const {
  login,
  refresh,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
} = require("./auth.controller");
const { authenticate } = require("../../middleware/authenticate");

const router = express.Router();

// ── Validation schemas ────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "OTP must be exactly 6 digits",
    "string.pattern.base": "OTP must be numeric",
  }),
});

const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
  }),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };
}

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many OTP attempts from this IP, please try again later" }
});

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Forgot Password — 3-step OTP flow
router.post("/forgot-password", otpLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/reset-password", otpLimiter, validate(resetPasswordSchema), resetPassword);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
