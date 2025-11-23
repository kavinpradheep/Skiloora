// backend/modules/auth/temp.controller.js
const admin = require('../../config/firebaseAdmin');
const db = admin.firestore();

/**
 * checkEmail
 * - Checks if an email already exists in Auth, Firestore `users`, or tempSignups.
 * - Returns { ok: true, exists: boolean, source?: 'auth'|'firestore'|'temp', ... }
 */
exports.checkEmail = async (req, res) => {
  try {
    const emailRaw = (req.body.email || '').toString().trim();
    if (!emailRaw) return res.status(400).json({ ok: false, error: 'missing_email' });
    const email = emailRaw.toLowerCase();

    // 1) Check Firebase Auth (authoritative)
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord && userRecord.uid) {
        return res.json({ ok: true, exists: true, source: 'auth', uid: userRecord.uid });
      }
    } catch (err) {
      // getUserByEmail throws if not found; ignore "user-not-found", log other errors
      if (!(err && err.code && err.code === 'auth/user-not-found')) {
        console.warn('getUserByEmail warning', err && err.message ? err.message : err);
      }
    }

    // 2) Check Firestore users collection
    try {
      const q = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!q.empty) {
        const doc = q.docs[0];
        return res.json({ ok: true, exists: true, source: 'firestore', docId: doc.id });
      }
    } catch (err) {
      console.warn('users collection check warning', err && err.message ? err.message : err);
    }

    // 3) Check tempSignups collection (prevent duplicate pending signups)
    try {
      const tmpQ = await db.collection('tempSignups').where('email', '==', email).limit(1).get();
      if (!tmpQ.empty) {
        const tmpDoc = tmpQ.docs[0];
        return res.json({ ok: true, exists: true, source: 'temp', tempId: tmpDoc.id });
      }
    } catch (err) {
      console.warn('tempSignups check warning', err && err.message ? err.message : err);
    }

    // Not found anywhere
    return res.json({ ok: true, exists: false });
  } catch (err) {
    console.error('checkEmail error', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    return res.status(500).json({ ok: false, error: 'server_error', message: err.message || String(err) });
  }
};

/**
 * saveTemp — store a temporary signup (used before payment)
 * NOTE: In dev we store the password to create the user later; in production you should not store plaintext passwords.
 */
exports.saveTemp = async (req, res) => {
  try {
    const { name, email, password, location } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'missing_fields' });

    const data = {
      name: name || '',
      email: (email || '').toLowerCase().trim(),
      password: password || '', // dev-only: stored temporarily for account creation after payment
      location: location || '',
      role: 'freelancer',
      status: 'waiting_payment',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection('tempSignups').add(data);
    console.log('TEMP SIGNUP CREATED:', ref.id);
    return res.json({ ok: true, tempId: ref.id });
  } catch (err) {
    console.error('saveTemp error', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
};

/**
 * deleteTemp — remove a temp signup (used on payment failure / rollback)
 */
exports.deleteTemp = async (req, res) => {
  try {
    const { tempId } = req.body;
    if (!tempId) return res.status(400).json({ error: 'missing_tempId' });

    await db.collection('tempSignups').doc(tempId).delete();
    console.log('TEMP SIGNUP DELETED:', tempId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteTemp error', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
};
