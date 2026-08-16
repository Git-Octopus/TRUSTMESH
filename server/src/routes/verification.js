const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');

router.post('/verify', verificationController.verifyClaim);
router.get('/history', verificationController.getVerificationHistory);

module.exports = router;
