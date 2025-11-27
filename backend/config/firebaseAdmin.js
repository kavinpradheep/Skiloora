// firebaseAdmin.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const svcPathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  // 1) Explicit path via env
  if (svcPathEnv && fs.existsSync(svcPathEnv)) {
    const serviceAccount = require(svcPathEnv);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  // 2) Inline JSON via env
  else if (jsonEnv) {
    const serviceAccount = JSON.parse(jsonEnv);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  // 3) Local files commonly committed in this repo
  else {
    const backendRoot = path.resolve(__dirname, '..');
    const candidates = [
      path.join(backendRoot, 'serviceAccountKey.json'),
      path.join(backendRoot, 'config', 'serviceAccountKey.json')
    ];
    const found = candidates.find(p => fs.existsSync(p));
    if (found) {
      const serviceAccount = require(found);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // 4) Fallback to ADC (requires GOOGLE_APPLICATION_CREDENTIALS or GCP metadata)
      admin.initializeApp();
    }
  }
  return admin;
}

module.exports = initFirebaseAdmin();
