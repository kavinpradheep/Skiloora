// backend/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();

// adjust path if you moved controller to middleware — use the path that matches your file
const controller = require('../../middleware/auth.controller'); // <- your file

// Temp signup endpoints used by frontend
router.post('/temp-save', controller.createTempSignup);
router.post('/temp-delete', controller.deleteTempSignup);

// Login & reset (already in your controller)
router.post('/login', controller.login);
router.post('/send-reset', controller.sendReset);

module.exports = router;
