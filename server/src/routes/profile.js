const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public profile retrieval by wallet address
router.get('/:wallet', profileController.getProfileByWallet);

// Authenticated profile management
router.post('/', authMiddleware, requireRole('owner', 'verifier', 'admin'), profileController.createProfile);
router.put('/', authMiddleware, requireRole('owner', 'verifier', 'admin'), profileController.updateProfile);

module.exports = router;
