// backend/payments/payment.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');

router.post('/create-order', controller.createOrder);
router.post('/verify', controller.verifyPayment);

module.exports = router;
