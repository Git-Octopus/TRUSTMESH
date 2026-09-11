/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles - Array of allowed role names (e.g. 'owner', 'verifier', 'admin')
 */
module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not authenticated',
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles, but user has role '${userRole}'`,
      });
    }

    next();
  };
};
