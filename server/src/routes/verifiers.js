const express = require('express');
const router = express.Router();
const verifierController = require('../controllers/verifierController');

router.get('/', verifierController.getVerifiers);
router.post('/', verifierController.addVerifier);

module.exports = router;
