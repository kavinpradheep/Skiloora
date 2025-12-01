const express = require('express');
const router = express.Router();
const controller = require('./admin.controller');
// Optional: protect with auth middleware if desired
// const auth = require('../../middleware/auth');

// Admin metrics
router.get('/metrics', controller.getMetrics);

// Users role map (auth ↔ firestore)
router.get('/users-map', controller.getUsersRoleMap);

// Users list for Admin Users page
router.get('/users-list', controller.getUsersList);

// Payments list for Admin Payments page
router.get('/payments-list', controller.getPaymentsList);
router.get('/revenue-stats', controller.getRevenueStats);

module.exports = router;
