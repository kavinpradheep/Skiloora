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
    console.log('[firebaseAdmin] Using service account from env path:', svcPathEnv);
    const serviceAccount = JSON.parse(fs.readFileSync(svcPathEnv, 'utf8'));
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
    console.log('[firebaseAdmin] Checking for service account key at:');
    candidates.forEach(p => console.log('  -', p, fs.existsSync(p) ? '[FOUND]' : '[NOT FOUND]'));
    const found = candidates.find(p => fs.existsSync(p));
    if (found) {
      console.log('[firebaseAdmin] Using service account from:', found);
      const serviceAccount = JSON.parse(fs.readFileSync(found, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('[firebaseAdmin] No service account key found. Falling back to ADC.');
      // 4) Fallback to ADC (requires GOOGLE_APPLICATION_CREDENTIALS or GCP metadata)
      admin.initializeApp();
    }
  }
  return admin;
}

module.exports = initFirebaseAdmin();
