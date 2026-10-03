const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/uploadMulter');

// Public claim listings and lookup
router.get('/', claimController.getClaims);
router.get('/:id', claimController.getClaimById);

// Authenticated claim creation and evidence upload
router.post('/', authMiddleware, requireRole('owner', 'verifier', 'admin'), claimController.createClaim);
router.put('/:id', authMiddleware, requireRole('owner', 'verifier', 'admin'), claimController.updateClaim);
router.delete('/:id', authMiddleware, requireRole('owner', 'verifier', 'admin'), claimController.deleteClaim);
router.post(
  '/:id/evidence',
  authMiddleware,
  requireRole('owner', 'verifier', 'admin'),
  upload.single('evidence'),
  claimController.uploadClaimEvidence
);

module.exports = router;
