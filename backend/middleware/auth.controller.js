// backend/middleware/auth.controller.js
const admin = require('../config/firebaseAdmin'); // adjust relative path if needed
const db = admin.firestore();

/**
 * Check whether an email already exists.
 * Response:
 *  - { ok: true, exists: true, source: 'auth', uid, email }  // exists in Firebase Auth
 *  - { ok: true, exists: true, source: 'temp', tempId }      // exists as a temp signup waiting payment
 *  - { ok: true, exists: false }                             // free to use
 */
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'missing_email' });
    const normalized = (email || '').toLowerCase().trim();

    // 1) Check in Firebase Auth
    try {
      const user = await admin.auth().getUserByEmail(normalized);
      return res.json({ ok: true, exists: true, source: 'auth', uid: user.uid, email: user.email });
    } catch (err) {
      // if user-not-found, fallthrough to check tempSignups
      if (!(err.code === 'auth/user-not-found' || (err.message && err.message.includes('user-not-found')))) {
        console.error('checkEmail unexpected auth error', err);
        return res.status(500).json({ ok: false, error: 'server_error', message: err.message || String(err) });
      }
    }

    // 2) Check if a temp signup already exists for this email and is still waiting payment
    try {
      const q = await db.collection('tempSignups')
        .where('email', '==', normalized)
        .where('status', '==', 'waiting_payment')
        .limit(1)
        .get();

      if (!q.empty) {
        const doc = q.docs[0];
        return res.json({ ok: true, exists: true, source: 'temp', tempId: doc.id });
      }
    } catch (err) {
      console.error('checkEmail firestore error', err);
      return res.status(500).json({ ok: false, error: 'server_error', message: err.message || String(err) });
    }

    // Not found anywhere
    return res.json({ ok: true, exists: false });
  } catch (err) {
    console.error('checkEmail outer error', err);
    return res.status(500).json({ ok: false, error: 'server_error', message: err.message || String(err) });
  }
};

// LOGIN (verifies ID token sent as "Authorization: Bearer <idToken>")
exports.login = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/Bearer (.+)/);
    if (!match) return res.status(401).json({ error: 'Missing Authorization header' });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    // Determine admin via custom claims first
    let isAdmin = !!decoded.admin || (decoded.role === 'admin');
    // Fallback to Firestore `admins` collection if claim not present
    if (!isAdmin) {
      try {
        const doc = await db.collection('admins').doc(uid).get();
        isAdmin = doc.exists;
      } catch (_) {}
    }
    return res.json({ ok: true, uid, email: decoded.email, isAdmin });
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

    const normalized = (email || '').toLowerCase().trim();

    // SERVER-SIDE DOUBLE CHECK: If an Auth user already exists, reject (prevent race)
    try {
      const existing = await admin.auth().getUserByEmail(normalized);
      if (existing && existing.uid) {
        return res.status(409).json({ ok: false, error: 'email_in_use', source: 'auth', uid: existing.uid });
      }
    } catch (err) {
      if (!(err.code === 'auth/user-not-found' || (err.message && err.message.includes('user-not-found')))) {
        console.error('createTempSignup auth lookup failed unexpectedly', err);
        return res.status(500).json({ ok: false, error: 'server_error', message: err.message || String(err) });
      }
      // user-not-found => ok to continue
    }

    // Also check if tempSignups already has a pending entry for this email
    const q = await db.collection('tempSignups')
      .where('email', '==', normalized)
      .where('status', '==', 'waiting_payment')
      .limit(1)
      .get();

    if (!q.empty) {
      return res.status(409).json({ ok: false, error: 'temp_exists', source: 'temp', tempId: q.docs[0].id });
    }

    // Save the temp signup (dev only: password is saved to create Auth later)
    const tempRef = await db.collection('tempSignups').add({
      name: name || '',
      email: normalized,
      password: password || '',
      location: location || '',
      role: 'freelancer',
      status: 'waiting_payment',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('TEMP SIGNUP CREATED:', tempRef.id);
    return res.json({ ok: true, tempId: tempRef.id });
  } catch (err) {
    console.error('createTempSignup error', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
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
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
};

// helper for other modules if needed
exports.verifyIdToken = async (idToken) => {
  if (!idToken) throw new Error('no_token');
  return await admin.auth().verifyIdToken(idToken);
};
