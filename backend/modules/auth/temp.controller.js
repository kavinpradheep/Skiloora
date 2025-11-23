// backend/modules/auth/temp.controller.js
const admin = require('../../config/firebaseAdmin');
const db = admin.firestore();

exports.saveTemp = async (req, res) => {
  try {
    const { name, email, password, location } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

    // Save the temp signup (dev only: password is saved to create Auth later)
    const data = {
      name: name || '',
      email: (email || '').toLowerCase().trim(),
      password: password || '',
      location: location || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection('tempSignups').add(data);
    return res.json({ ok: true, tempId: ref.id });
  } catch (err) {
    console.error('saveTemp error', err);
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
};

exports.deleteTemp = async (req, res) => {
  try {
    const { tempId } = req.body;
    if (!tempId) return res.status(400).json({ error: 'missing_tempId' });
    await db.collection('tempSignups').doc(tempId).delete();
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteTemp error', err);
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
};
