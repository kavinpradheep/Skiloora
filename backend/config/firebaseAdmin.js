// firebaseAdmin.js
const admin = require('firebase-admin');
const fs = require('fs');

function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (path && fs.existsSync(path)) {
    const serviceAccount = require(path);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (jsonEnv) {
    const serviceAccount = JSON.parse(jsonEnv);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // fallback to application default credentials (GCP environment)
    admin.initializeApp();
  }
  return admin;
}

module.exports = initFirebaseAdmin();
