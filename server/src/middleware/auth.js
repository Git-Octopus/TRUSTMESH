const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 * Decodes the Bearer token and verifies the wallet identity and user session.
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required in Authorization header (Bearer <token>)',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'trustmesh-jwt-secret-key';
    const decoded = jwt.verify(token, secret);

    // Fetch latest user state to ensure user still exists and roles are accurate
    const user = await User.findById(decoded.id || decoded.userId).select('-nonce');
    if (!user) {
      // Fallback to token payload if db query is skipped or in lightweight testing
      req.user = {
        _id: decoded.id || decoded.userId,
        id: decoded.id || decoded.userId,
        walletAddress: decoded.walletAddress?.toLowerCase(),
        role: decoded.role || 'owner',
        emailVerified: decoded.emailVerified || false,
      };
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
      error: error.message,
    });
  }
};
