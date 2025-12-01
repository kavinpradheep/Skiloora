// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const paymentRoutes = require('./payments/payment.routes');
const webhook = require('./payments/webhook');
const freelancerRoutes = require('./modules/freelancer/freelancer.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// AUTH ROUTES (login, reset, temp-signups)
const authRoutes = require('./modules/auth/auth.routes');
const tempRoutes = require('./modules/auth/temp.routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------------------
// CORRECT ROUTE MOUNTING
// ------------------------------

// 🔹 All authentication-related routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', tempRoutes);

// 🔹 Payment routes
app.use('/api/payments', paymentRoutes);

// 🔹 Razorpay webhook
app.use('/api/payments/webhook', webhook);

// 🔹 Other modules
app.use('/api/freelancer', freelancerRoutes);
app.use('/api/admin', adminRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Skiloora backend running on port ${PORT}`);
});
