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

exports.searchFreelancers = async (req, res) => {
  try {
    const { roleKey, q } = req.query;
    const db = admin.firestore();
    let results = [];

    if (roleKey) {
      const snap = await db.collection('users').where('roleKey', '==', String(roleKey)).limit(100).get();
      results = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    }

    if (!roleKey || results.length === 0) {
      // Fallback: fetch a pool of freelancers and filter by keyword if provided
      let poolSnap;
      try {
        poolSnap = await db.collection('users').where('role', 'in', ['freelancer', 'Freelancer']).limit(200).get();
      } catch (e) {
        poolSnap = await db.collection('users').limit(200).get();
      }
      let pool = poolSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
      if (q) {
        const term = String(q).toLowerCase();
        const norm = s => String(s || '').toLowerCase();
        pool = pool.filter(u => {
          const text = [u.title, u.roleLong, u.name, u.username, u.bio].map(norm).join(' ');
          const arr = [];
          if (Array.isArray(u.skills)) arr.push(...u.skills.map(norm));
          if (Array.isArray(u.tags)) arr.push(...u.tags.map(norm));
          return text.includes(term) || arr.some(s => s.includes(term));
        });
      }
      if (results.length === 0) results = pool;
    }

    // Filter out moderated (banned or currently suspended)
    async function isActive(uid){
      try{
        const m = await db.collection('userModeration').doc(String(uid)).get();
        if (!m.exists) return true;
        const d = m.data();
        const status = String(d.status || 'active').toLowerCase();
        if (status === 'banned') return false;
        if (status === 'suspended'){
          let until = null;
          if (d.until && typeof d.until.toDate === 'function') until = d.until.toDate();
          else if (d.until) { const t = new Date(d.until); if (!isNaN(t.getTime())) until = t; }
          if (until && Date.now() < until.getTime()) return false;
        }
      }catch(_){ }
      return true;
    }

    const filtered = [];
    for (const u of results){
      const ok = await isActive(u.uid);
      if (ok) filtered.push(u);
      if (filtered.length >= 100) break; // cap to avoid excessive reads
    }

    // Minimal projection for list
    const items = filtered.map(u => ({
      uid: u.uid,
      name: u.name || u.username || 'Freelancer',
      title: u.title || u.roleLong || '',
      country: u.country || '',
      rating: typeof u.rating === 'number' ? u.rating : 4.0,
      bio: u.bio || '',
      avatarUrl: u.avatarUrl || ''
    }));
    return res.json({ ok: true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};
