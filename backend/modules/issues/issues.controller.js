const admin = require('../../config/firebaseAdmin');
const db = admin.firestore();

// Detect user type based on Firestore user doc
async function resolveUserType(uid){
  try{
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return { userType: 'buyer', profile: {} };
    const u = snap.data();
    const role = String(u.role || u.roleKey || '').toLowerCase();
    if (u.isFreelancer === true || role === 'freelancer') return { userType: 'freelancer', profile: u };
    return { userType: 'buyer', profile: u };
  }catch(e){ return { userType: 'buyer', profile: {} }; }
}

// POST /api/issues/report
exports.reportIssue = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ ok:false, error: 'missing_token' });
    const idToken = authHeader.split('Bearer ')[1].trim();
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(idToken); } catch(err){ return res.status(401).json({ ok:false, error:'invalid_token' }); }

    const { subject, priority, description } = req.body || {};
    const sub = String(subject || '').trim();
    const pri = String(priority || 'low').toLowerCase();
    const desc = String(description || '').trim();
    if (!sub || !desc) return res.status(400).json({ ok:false, error:'missing_fields' });
    if (!['low','medium','high'].includes(pri)) return res.status(400).json({ ok:false, error:'invalid_priority' });

    const { userType, profile } = await resolveUserType(decoded.uid);
    const docRef = await db.collection('issues').add({
      uid: decoded.uid,
      userType,
      subject: sub,
      priority: pri,
      description: desc,
      status: 'open',
      displayName: profile.name || profile.username || profile.company || decoded.name || decoded.email || 'User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.json({ ok:true, id: docRef.id });
  } catch (err) {
    console.error('reportIssue error', err);
    res.status(500).json({ ok:false, error:'server_error' });
  }
};
