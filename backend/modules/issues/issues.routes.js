const express = require('express');
const router = express.Router();
const controller = require('./issues.controller');

router.post('/report', express.json(), controller.reportIssue);

module.exports = router;
