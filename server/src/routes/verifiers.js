const express = require('express');
const router = express.Router();
const verifierController = require('../controllers/verifierController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public list of authorized verifiers
router.get('/', verifierController.getVerifiers);

// Admin-only verifier registration, approval and revocation
router.post('/', authMiddleware, requireRole('admin'), verifierController.addVerifier);
router.post('/:wallet/approve', authMiddleware, requireRole('admin'), verifierController.approveVerifier);
router.delete('/:wallet', authMiddleware, requireRole('admin'), verifierController.revokeVerifier);
router.get('/admin-overview', authMiddleware, requireRole('admin'), verifierController.getAdminOverview);

// Verifier & Admin user directory and suspension
router.get('/users-directory', authMiddleware, requireRole('verifier', 'admin'), verifierController.getUsersDirectory);
router.post('/users/:wallet/suspend', authMiddleware, requireRole('verifier', 'admin'), verifierController.suspendUser);
router.post('/users/:wallet/reinstate', authMiddleware, requireRole('verifier', 'admin'), verifierController.reinstateUser);

module.exports = router;
