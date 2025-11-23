// auth.js - verifies Firebase ID token from Authorization: Bearer <idToken>
const admin = require('../config/firebaseAdmin');
const express = require('express');
const router = express.Router();
const { login } = require('./auth.controller');

router.post('/login', login);

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const idToken = auth.split('Bearer ')[1].trim();
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.auth = decoded;
    next();
  } catch (err) {
    console.error('authMiddleware error', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = authMiddleware;
module.exports = router;
