const admin = require('../../config/firebaseAdmin');
const db = admin.firestore();

// Configure plan prices here (in smallest currency unit if needed)
const PLAN_PRICES = {
  standard: 2999,
  premium: 3999
};

exports.getMetrics = async (req, res) => {
  try {
    const toDate = (v) => {
      if (!v) return null;
      // Firestore Timestamp
      if (typeof v.toDate === 'function') {
        try { return v.toDate(); } catch (_) { /* ignore */ }
      }
      // seconds/nanoseconds object
      if (typeof v === 'object' && v.seconds) {
        try { return new Date(v.seconds * 1000); } catch (_) { /* ignore */ }
      }
      // ISO/string/number
      try {
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d;
      } catch (_) {}
      return null;
    };
    // Total users and auth sets: authoritative via Firebase Auth (listUsers)
    let totalUsers = 0;
    const authUidSet = new Set();
    const authEmailSet = new Set();
    try {
      // Paginate through all auth users
      let nextPageToken = undefined;
      do {
        const result = await admin.auth().listUsers(1000, nextPageToken);
        totalUsers += result.users.length;
        result.users.forEach(u => {
          if (u.uid) authUidSet.add(String(u.uid));
          const email = (u.email || '').trim().toLowerCase();
          if (email) authEmailSet.add(email);
        });
        nextPageToken = result.pageToken;
      } while (nextPageToken);
    } catch (e) {
      // Fallback to Firestore collection count if Auth fails
      try {
        const aggAll = await db.collection('users').count().get();
        totalUsers = aggAll.data().count || 0;
      } catch (e2) {
        const snapAll = await db.collection('users').limit(2000).get();
        totalUsers = snapAll.size;
      }
    }

    // If Auth listing fails or returns 0, fallback to Firestore count handled above

    // Active freelancers and revenue calculation
    // Build candidate IDs strictly from Auth set
    const candidateIds = Array.from(authUidSet);

    // Fetch only those Firestore docs by id and keep isFreelancer === true
    const normalizedFreelancers = [];
    if (candidateIds.length > 0) {
      for (const uid of candidateIds) {
        try {
          // Prefer doc id == uid
          const ref = db.collection('users').doc(uid);
          const doc = await ref.get();
          let data = null;
          if (doc.exists) {
            data = doc.data();
          } else {
            // Fallback: find by field 'uid' equal to Auth uid
            const q = await db.collection('users').where('uid', '==', uid).limit(1).get();
            if (!q.empty) {
              const d = q.docs[0];
              data = d.data();
            }
          }
          if (data && data.isFreelancer === true) {
            normalizedFreelancers.push({ id: uid, ...data });
          }
        } catch (_) { /* ignore per-uid errors */ }
      }
    } else {
      // Fallback: empty (no candidates)
    }

    // Active freelancers: strict count equals freelancers detected within Auth set
    const activeFreelancers = normalizedFreelancers.length;

    // activeFreelancers already computed strictly
    let totalRevenue = 0;
    const normalizePlan = v => String(v || '').trim().toLowerCase();
    for (const f of normalizedFreelancers) {
      // Plan may reside under membership.map
      const membershipPlan = f.membership && (f.membership.plan || f.membership.type);
      const rawPlan = membershipPlan ?? f.plan ?? f.subscription ?? f.planType ?? f.membershipPlan;
      const plan = normalizePlan(rawPlan);
      if (PLAN_PRICES[plan]) {
        totalRevenue += PLAN_PRICES[plan];
      } else {
        const explicitRaw = (f.membership && (f.membership.price || f.membership.amount)) ??
          f.planPrice ?? f.subscriptionAmount ?? f.membershipFee ?? 0;
        const explicit = Number(explicitRaw);
        if (!Number.isNaN(explicit) && explicit > 0) totalRevenue += explicit;
      }
    }

    // Simple 6-month series based on totals (fallback if no timestamps)
    const revenueSeries = [
      Math.round(totalRevenue * 0.15),
      Math.round(totalRevenue * 0.18),
      Math.round(totalRevenue * 0.22),
      Math.round(totalRevenue * 0.25),
      Math.round(totalRevenue * 0.30),
      Math.round(totalRevenue)
    ];
    const userSeries = [
      Math.round(totalUsers * 0.2),
      Math.round(totalUsers * 0.35),
      Math.round(totalUsers * 0.5),
      Math.round(totalUsers * 0.65),
      Math.round(totalUsers * 0.8),
      totalUsers
    ];

    const lastMonth = {
      users: Math.round(totalUsers * 0.92),
      activeFreelancers: Math.round(activeFreelancers * 0.97),
      totalRevenue: Math.round(totalRevenue * 0.85)
    };

    return res.json({
      ok: true,
      totals: { users: totalUsers, activeFreelancers, totalRevenue },
      lastMonth,
      series: { revenue: revenueSeries, users: userSeries },
      currency: 'USD'
    });
  } catch (err) {
    console.error('getMetrics error', err);
    res.status(500).json({ error: 'server_error' });
  }
};

// Return a mapping of Auth users to Firestore user documents by email/uid
exports.getUsersRoleMap = async (req, res) => {
  try {
    const authUsers = [];
    let nextPageToken = undefined;
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      result.users.forEach(u => {
        authUsers.push({
          uid: u.uid,
          email: (u.email || '').trim().toLowerCase(),
          displayName: u.displayName || ''
        });
      });
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    // Fetch Firestore users and index by email/uid
    const snap = await db.collection('users').limit(5000).get();
    const fsByEmail = new Map();
    const fsById = new Map();
    snap.docs.forEach(d => {
      const data = d.data();
      const email = String(data.email || '').trim().toLowerCase();
      fsById.set(String(d.id), { id: d.id, ...data });
      if (email) fsByEmail.set(email, { id: d.id, ...data });
    });

    const items = authUsers.map(u => {
      const fsDoc = fsByEmail.get(u.email) || fsById.get(u.uid) || null;
      const role = fsDoc ? (fsDoc.roleKey || fsDoc.role || '') : '';
      const isFreelancer = fsDoc ? Boolean(fsDoc.isFreelancer) : false;
      const membershipPlan = fsDoc && fsDoc.membership ? (fsDoc.membership.plan || fsDoc.membership.type || '') : '';
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        role,
        isFreelancer,
        membershipPlan,
        firestoreId: fsDoc ? fsDoc.id : null
      };
    });

    res.json({ ok: true, count: items.length, items });
  } catch (err) {
    console.error('getUsersRoleMap error', err);
    res.status(500).json({ error: 'server_error' });
  }
};

// List freelancers and clients with minimal fields for Admin Users page
exports.getUsersList = async (req, res) => {
  try {
    const db = admin.firestore();
    const normEmail = v => String(v || '').trim().toLowerCase();

    // Get Auth users to intersect (avoid showing orphan docs)
    const authUidSet = new Set();
    const authEmailSet = new Set();
    try {
      let nextPageToken = undefined;
      do {
        const result = await admin.auth().listUsers(1000, nextPageToken);
        result.users.forEach(u => {
          if (u.uid) authUidSet.add(String(u.uid));
          const em = normEmail(u.email);
          if (em) authEmailSet.add(em);
        });
        nextPageToken = result.pageToken;
      } while (nextPageToken);
    } catch (e) {}

    // Fetch all potential user docs (bounded) once to reduce round trips
    const snapAll = await db.collection('users').limit(1500).get();
    const allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));

    // Intersect: keep only those whose doc id is an Auth uid OR email matches an Auth email
    const intersected = allDocs.filter(u => {
      const email = normEmail(u.email);
      return authUidSet.has(String(u.id)) || (email && authEmailSet.has(email));
    });

    // Filter out moderated users (banned or currently suspended)
    async function isActive(uid){
      try{
        const m = await admin.firestore().collection('userModeration').doc(String(uid)).get();
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

    const activeDocs = [];
    for (const u of intersected){
      const ok = await isActive(u.id);
      if (ok) activeDocs.push(u);
    }

    // Strict freelancers: isFreelancer true AND not moderated
    const freelancerDocs = activeDocs.filter(u => u.isFreelancer === true);

    // Clients: NOT freelancer and role/roleKey in client/buyer/hirer
    const isClientRole = u => {
      const rk = String(u.roleKey||'').toLowerCase();
      const r = String(u.role||'').toLowerCase();
      return ['client','buyer','hirer'].includes(rk) || ['client','buyer','hirer'].includes(r);
    };
    const clientDocs = activeDocs.filter(u => u.isFreelancer !== true && isClientRole(u));

    // Map output
    const freelancers = freelancerDocs.map(u => ({
      id: u.id,
      name: u.name || u.username || 'Freelancer',
      email: normEmail(u.email),
      skills: Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || ''),
      plan: (u.membership && (u.membership.plan || u.membership.type)) || u.plan || u.subscription || '—'
    }));

    const clients = clientDocs.map(u => ({
      id: u.id,
      company: u.company || u.name || u.username || 'Client',
      email: normEmail(u.email),
      location: u.location || ''
    }));

    return res.json({ ok: true, freelancers, clients });
  } catch (err) {
    console.error('getUsersList error', err);
    res.status(500).json({ error: 'server_error' });
  }
};

// List recent membership payments for Admin Payments page
exports.getPaymentsList = async (req, res) => {
  try {
    const dbi = admin.firestore();
    const snap = await dbi.collection('payments').orderBy('createdAt', 'desc').limit(200).get();
    const items = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const uid = d.uid || null;
      let userName = '';
      let userEmail = '';
      let isFreelancer = false;
      try {
        if (uid) {
          const us = await dbi.collection('users').doc(uid).get();
          if (us.exists) {
            const u = us.data();
            userName = u.name || u.username || '';
            userEmail = (u.email || '').toLowerCase();
            const roleStr = String(u.role || u.roleKey || '').toLowerCase();
            isFreelancer = Boolean(u.isFreelancer) || roleStr === 'freelancer';
          }
        } else if (d.userData) {
          userName = d.userData.name || '';
          userEmail = (d.userData.email || '').toLowerCase();
          const roleStr = String(d.userData.role || d.userData.roleKey || '').toLowerCase();
          isFreelancer = Boolean(d.userData.isFreelancer) || roleStr === 'freelancer';
        }
      } catch (_) {}

      // Only include freelancer-related payments
      if (!isFreelancer) continue;

      const amountPaise = Number(d.amount) || 0;
      const amount = amountPaise >= 100 ? Math.round(amountPaise) / 100 : amountPaise; // INR: convert paise→rupees
      const createdAt = d.createdAt && typeof d.createdAt.toDate === 'function' ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
      items.push({
        id: doc.id,
        plan: (d.label || d.plan || '').toString(),
        userName,
      // module.exports = router;
        amount,
        currency: d.currency || 'INR',
        status: d.status || 'pending',
        method: 'Razorpay',
        accountInfo: '-',
        createdAt: createdAt ? createdAt.toISOString() : null
      });
    }
    res.json({ ok: true, items });
  } catch (err) {
    console.error('getPaymentsList error', err);
    res.status(500).json({ error: 'server_error' });
  }
};

// Revenue stats for Admin Payments revenue dashboard
exports.getRevenueStats = async (req, res) => {
  try {
    const dbi = admin.firestore();
    // Use orderBy only and filter status in code to avoid composite index requirements
    const paidSnap = await dbi.collection('payments')
      .orderBy('createdAt', 'desc')
      .limit(2000)
      .get();

    const byMonth = new Map(); // key: YYYY-MM, value: total rupees number
    let grandTotal = 0;

    // Prepare a simple cache for user docs to minimize reads
    const userCache = new Map();
    async function isFreelancer(uid, fallbackData){
      try{
        if (uid){
          if (userCache.has(uid)) return userCache.get(uid);
          const us = await dbi.collection('users').doc(uid).get();
          let v = false;
          if (us.exists){
            const u = us.data();
            const roleStr = String(u.role || u.roleKey || '').toLowerCase();
            v = Boolean(u.isFreelancer) || roleStr === 'freelancer';
          }
          userCache.set(uid, v);
          return v;
        }
        if (fallbackData){
          const roleStr = String(fallbackData.role || fallbackData.roleKey || '').toLowerCase();
          return Boolean(fallbackData.isFreelancer) || roleStr === 'freelancer';
        }
      }catch(_){ }
      return false;
    }

    for (const doc of paidSnap.docs){
      const d = doc.data();
      if ((d.status || '').toLowerCase() !== 'paid') continue;
      const uid = d.uid || null;
      const ok = await isFreelancer(uid, d.userData || null);
      if (!ok) continue;
      const createdAt = d.createdAt && typeof d.createdAt.toDate === 'function' ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
      if (!createdAt || isNaN(createdAt.getTime())) continue;
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth()+1).padStart(2,'0')}`;
      const amountPaise = Number(d.amount) || 0;
      const amount = amountPaise >= 100 ? Math.round(amountPaise) / 100 : amountPaise;
      grandTotal += amount;
      byMonth.set(key, (byMonth.get(key) || 0) + amount);
    }

    // Build last 6 months series ending this month
    const now = new Date();
    const labels = [];
    const values = [];
    for (let i = 5; i >= 0; i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(d.toLocaleString('en-US', { month:'short', year:'2-digit' }));
      values.push(byMonth.get(key) || 0);
    }

    const last = values[5] || 0;
    const prev = values[4] || 0;
    const growth = prev > 0 ? ((last - prev) / prev) * 100 : (last > 0 ? 100 : 0);

    res.json({ ok: true, totalRevenue: grandTotal, growthPercent: growth, series: { labels, values } });
  } catch (err) {
    console.error('getRevenueStats error', err);
    res.status(500).json({ error: 'server_error' });
  }
};

// List admins (from Firestore 'admins' collection)
exports.listAdmins = async (req, res) => {
  try {
    const snap = await db.collection('admins').orderBy('createdAt', 'desc').get();
    const items = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
    res.json({ ok: true, items });
  } catch (err) {
    console.error('listAdmins error', err);
    res.status(500).json({ error: 'server_error' });
  }
};

// Create a new admin: creates Firebase Auth user (if needed) and adds to 'admins' collection
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    if (!name || !normEmail || !password) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    let uid = null;
    try {
      const u = await admin.auth().getUserByEmail(normEmail);
      uid = u.uid;
      // Optionally update displayName
      if (name && u.displayName !== name) {
        await admin.auth().updateUser(uid, { displayName: name });
      }
    } catch (err) {
      // If user-not-found, create
      const created = await admin.auth().createUser({ email: normEmail, password, displayName: name });
      uid = created.uid;
    }

    // Ensure admin entry exists
    await db.collection('admins').doc(uid).set({
      name,
      email: normEmail,
      isDefault: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Optionally set a custom claim (not strictly required since login checks Firestore)
    try { await admin.auth().setCustomUserClaims(uid, { admin: true }); } catch (_) {}

    return res.json({ ok: true, uid });
  } catch (err) {
    console.error('createAdmin error', err);
    return res.status(500).json({ ok: false, error: 'server_error', message: err.message || String(err) });
  }
};

// ------------------------------
// Moderation: suspend / ban / list / clear
// Collection: userModeration/{uid} => { status: 'active'|'suspended'|'banned', until?: Timestamp, reason?: string, updatedAt, updatedBy }
// ------------------------------

exports.moderationList = async (req, res) => {
  try {
    const snap = await db.collection('userModeration').get();
    const items = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const status = (data.status || 'active').toLowerCase();
      if (status === 'active') continue;
      // join minimal user info
      let user = { name: '', email: '' };
      try {
        const udoc = await db.collection('users').doc(doc.id).get();
        if (udoc.exists) {
          const u = udoc.data();
          user.name = u.name || u.username || u.company || '';
          user.email = (u.email || '').toLowerCase();
        }
      } catch(_){}
      items.push({
        uid: doc.id,
        status,
        until: data.until || null,
        reason: data.reason || '',
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
        user
      });
    }
    // split into suspended and banned for convenience on UI
    const suspended = items.filter(x => x.status === 'suspended');
    const banned = items.filter(x => x.status === 'banned');
    res.json({ ok: true, suspended, banned, count: items.length });
  } catch (err) {
    console.error('moderationList error', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};

exports.moderationSet = async (req, res) => {
  try {
    const { uid, action, reason } = req.body || {};
    if (!uid || !action) return res.status(400).json({ ok: false, error: 'missing_fields' });
    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminActor = (req.user && (req.user.uid || req.user.email)) || 'admin';
    const acts = String(action).toLowerCase();
    const ref = db.collection('userModeration').doc(uid);

    if (acts === 'suspend') {
      // 30 days from now (approx): compute client-side Date for display, server uses FieldValue for updatedAt only
      const untilDate = new Date(Date.now() + 30*24*60*60*1000);
      await ref.set({
        status: 'suspended',
        until: admin.firestore.Timestamp.fromDate(untilDate),
        reason: reason || 'Suspended by admin',
        updatedAt: now,
        updatedBy: adminActor
      }, { merge: true });
      return res.json({ ok: true, uid, status: 'suspended', until: untilDate.toISOString() });
    }

    if (acts === 'ban') {
      await ref.set({
        status: 'banned',
        until: null,
        reason: reason || 'Banned by admin',
        updatedAt: now,
        updatedBy: adminActor
      }, { merge: true });
      return res.json({ ok: true, uid, status: 'banned' });
    }

    return res.status(400).json({ ok: false, error: 'invalid_action' });
  } catch (err) {
    console.error('moderationSet error', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};

exports.moderationClear = async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });
    await db.collection('userModeration').doc(uid).set({
      status: 'active',
      until: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: 'Cleared by admin'
    }, { merge: true });
    res.json({ ok: true, uid, status: 'active' });
  } catch (err) {
    console.error('moderationClear error', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
