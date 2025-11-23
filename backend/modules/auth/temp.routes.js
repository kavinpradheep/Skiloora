// backend/modules/auth/temp.routes.js
const express = require('express');
const router = express.Router();
const tempController = require('./temp.controller');

// POST /api/auth/check-email
router.post('/check-email', tempController.checkEmail);

// POST /api/auth/temp-save
router.post('/temp-save', tempController.saveTemp);

// POST /api/auth/temp-delete
router.post('/temp-delete', tempController.deleteTemp);

module.exports = router;
