// freelancer.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./freelancer.controller');
const auth = require('../../middleware/auth');

// minimal example route to fetch freelancer profile
router.get('/profile', auth, controller.getProfile);

module.exports = router;
