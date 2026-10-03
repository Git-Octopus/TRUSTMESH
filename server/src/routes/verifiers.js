const express = require('express');
const router = express.Router();
const verifierController = require('../controllers/verifierController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public list of authorized verifiers
router.get('/', verifierController.getVerifiers);

// Admin-only verifier registration and revocation
router.post('/', authMiddleware, requireRole('admin'), verifierController.addVerifier);
router.delete('/:wallet', authMiddleware, requireRole('admin'), verifierController.revokeVerifier);

module.exports = router;
