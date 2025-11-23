// backend/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();

const controller = require('../../middleware/auth.controller'); // path to the file above
const tempController = require('./temp.controller'); // optional - if you use separate temp controller

// New: check email endpoint
router.post('/check-email', controller.checkEmail);

// Temp signup endpoints used by frontend
// If you moved temp handlers to middleware auth.controller, adapt accordingly
router.post('/temp-save', controller.createTempSignup);   // or tempController.saveTemp
router.post('/temp-delete', controller.deleteTempSignup); // or tempController.deleteTemp

// Login & reset
router.post('/login', controller.login);
router.post('/send-reset', controller.sendReset);

module.exports = router;
