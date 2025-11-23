// freelancer.controller.js
const admin = require('../../config/firebaseAdmin');

exports.getProfile = async (req, res) => {
  try {
    const uid = req.uid;
    const userRef = admin.firestore().collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'not_found' });
    return res.json({ ok: true, profile: doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};
