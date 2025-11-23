// backend/modules/auth/temp.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./temp.controller');

router.post('/temp-save', controller.saveTemp);
router.post('/temp-delete', controller.deleteTemp);

module.exports = router;
