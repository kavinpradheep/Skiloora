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

// Admin management
router.get('/admins', controller.listAdmins);
router.post('/create-admin', controller.createAdmin);
router.post('/admin-delete', controller.deleteAdmin);
router.post('/reset-admin-password', controller.resetAdminPassword);

// Moderation routes
router.get('/moderation', controller.moderationList);
router.post('/moderation/set', controller.moderationSet);
router.post('/moderation/clear', controller.moderationClear);

// Issues (admin view)
router.get('/issues-list', controller.issuesList);
router.get('/issues-metrics', controller.issuesMetrics);
router.post('/issue-delete', controller.issueDelete);
router.post('/issue-status', controller.issueStatus);

module.exports = router;
