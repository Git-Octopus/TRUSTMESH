const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { authLimiter } = require('../middleware/rateLimiter');

// Public wallet authentication
router.post('/nonce', authLimiter, authController.getNonce);
router.post('/login', authLimiter, authController.login);

// Authenticated OTP email verification (owner/verifier/admin)
router.post('/send-otp', authMiddleware, requireRole('owner', 'verifier', 'admin'), authLimiter, authController.sendOtp);
router.post('/verify-otp', authMiddleware, requireRole('owner', 'verifier', 'admin'), authLimiter, authController.verifyOtp);

module.exports = router;
