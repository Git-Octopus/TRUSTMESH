const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const upload = require('../middleware/uploadMulter');

// Public profile retrieval by wallet address
router.get('/:wallet', profileController.getProfileByWallet);

// Authenticated profile management
router.post('/', authMiddleware, requireRole('owner', 'verifier', 'admin'), profileController.createProfile);
router.put('/', authMiddleware, requireRole('owner', 'verifier', 'admin'), profileController.updateProfile);

// Profile documents upload and management
router.post('/documents', authMiddleware, upload.single('document'), profileController.uploadProfileDocument);
router.delete('/documents/:docId', authMiddleware, profileController.deleteProfileDocument);

module.exports = router;
