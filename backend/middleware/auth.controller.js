// backend/middleware/auth.controller.js
const admin = require('../config/firebaseAdmin'); // path should be correct for your project
const db = admin.firestore();

// LOGIN (verifies ID token sent as "Authorization: Bearer <idToken>")
exports.login = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/Bearer (.+)/);
    if (!match) return res.status(401).json({ error: 'Missing Authorization header' });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    return res.json({ ok: true, uid: decoded.uid, email: decoded.email });
  } catch (err) {
    console.error('Auth login error', err);
    return res.status(401).json({ error: 'invalid_token', message: err.message });
  }
};

// sendReset - generate a firebase password reset link and return it (dev only)
exports.sendReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'missing_email' });

    const link = await admin.auth().generatePasswordResetLink(email);
    return res.json({ ok: true, resetLink: link });
  } catch (err) {
    console.error('sendReset error', err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};

// createTempSignup - store the user's signup form temporarily (will be deleted on failure or consumed on success)
exports.createTempSignup = async (req, res) => {
  try {
    const { name, email, location, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ ok: false, error: 'missing_fields' });

    const tempRef = await db.collection('tempSignups').add({
      name: name || '',
      email: (email || '').toLowerCase().trim(),
      location: location || '',
      password: password || null, // stored only temporarily; will be deleted after payment result
      role: 'freelancer',
      status: 'waiting_payment',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('TEMP SIGNUP CREATED:', tempRef.id);
    return res.json({ ok: true, tempId: tempRef.id });
  } catch (err) {
    console.error('createTempSignup error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// deleteTempSignup - remove a temp signup (used on payment failure/rollback)
exports.deleteTempSignup = async (req, res) => {
  try {
    const { tempId } = req.body;
    if (!tempId) return res.status(400).json({ ok: false, error: 'missing_tempId' });

    await db.collection('tempSignups').doc(tempId).delete();
    console.log('TEMP SIGNUP DELETED:', tempId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteTempSignup error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// helper for other modules if needed
exports.verifyIdToken = async (idToken) => {
  if (!idToken) throw new Error('no_token');
  return await admin.auth().verifyIdToken(idToken);
};
