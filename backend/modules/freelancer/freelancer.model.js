// freelancer.model.js
// placeholder - you can use this file to define data access helpers
const admin = require('../../config/firebaseAdmin');
const db = admin.firestore();

exports.createFreelancer = async (uid, data) => {
  const ref = db.collection('users').doc(uid);
  await ref.set({ ...data, role: 'freelancer' }, { merge: true });
  return ref;
};
