// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const paymentRoutes = require('./payments/payment.routes');
const webhook = require('./payments/webhook');
const freelancerRoutes = require('./modules/freelancer/freelancer.routes');

// THIS IS CORRECT — includes temp-save, temp-delete, login, reset
const authRoutes = require('./modules/auth/auth.routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------------------
// CORRECT ROUTE MOUNTING
// ------------------------------

// 🔹 All authentication-related routes here
app.use('/api/auth', authRoutes);

// 🔹 Payment routes
app.use('/api/payments', paymentRoutes);

// 🔹 Razorpay webhook
app.use('/api/payments/webhook', webhook);

// 🔹 Other modules
app.use('/api/freelancer', freelancerRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Skiloora backend running on port ${PORT}`);
});
