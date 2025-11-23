const express = require('express');
const router = express.Router();
const { sendReset } = require('../../middleware/auth.controller'); // or ../modules/auth/auth.controller depending on your structure

router.post('/send-reset', sendReset);

module.exports = router;
