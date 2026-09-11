const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Evidence hash computation and duplicate checking
router.post('/hash', verificationController.computeHash);

// Automated evidence check pipeline
router.post('/evidence-check', authMiddleware, requireRole('owner', 'verifier', 'admin'), verificationController.runEvidenceCheck);

// Claimant requests verification from authorized verifier
router.post('/request', authMiddleware, requireRole('owner', 'verifier', 'admin'), verificationController.requestVerification);

// Blockchain sync / verifier action sync
router.post('/sync', authMiddleware, requireRole('verifier', 'admin'), verificationController.syncVerification);

// Public trust score lookup
router.get('/trust-score/:profileId', verificationController.getTrustScore);

module.exports = router;
