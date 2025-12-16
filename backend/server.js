// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const paymentRoutes = require('./payments/payment.routes');
const webhook = require('./payments/webhook');
const freelancerRoutes = require('./modules/freelancer/freelancer.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const issuesRoutes = require('./modules/issues/issues.routes');

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
app.use('/api/issues', issuesRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Create default admin if none exists
async function ensureDefaultAdmin() {
  const admin = require('./config/firebaseAdmin');
  const db = admin.firestore();
  const email = 'admin@gmail.com';
  const password = 'Admin@123';
  const name = 'Default Admin';
  try {
    const snap = await db.collection('admins').limit(1).get();
    if (snap.empty) {
      let uid;
      try {
        // Try to create the user in Firebase Auth
        const user = await admin.auth().createUser({ email, password, displayName: name });
        uid = user.uid;
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          // If user already exists, get their UID
          const user = await admin.auth().getUserByEmail(email);
          uid = user.uid;
        } else {
          throw err;
        }
      }
      // Add to admins collection
      await db.collection('admins').doc(uid).set({
        name,
        email,
        isDefault: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      // Set custom claim
      try { await admin.auth().setCustomUserClaims(uid, { admin: true }); } catch (_) {}
      console.log('Default admin created:', email);
    }
  } catch (err) {
    console.error('Error ensuring default admin:', err);
  }
}

const DEFAULT_PORT = Number(process.env.PORT) || 5000;
async function start(port) {
  await ensureDefaultAdmin();
  const srv = app.listen(port, () => {
    console.log(`Skiloora backend running on port ${port}`);
  });
  srv.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const next = port + 1;
      console.warn(`Port ${port} in use. Trying ${next}...`);
      start(next);
    } else {
      console.error('Server start error:', err);
      process.exit(1);
    }
  });
}
start(DEFAULT_PORT);
