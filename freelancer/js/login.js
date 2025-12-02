// login.js (Firebase compat SDK)

const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const pwEl = document.getElementById('password');
const msg = document.getElementById('msg');

// redirectToDashboard(): Simple helper to navigate to dashboard page.
window.redirectToDashboard = function(){
  try {
    window.location.href = './dashboard.html';
  } catch(e){}
};
// showMsg(text,isError): Display status or error message inline.
function showMsg(text, isError = true){
  msg.textContent = text;
  msg.style.color = isError ? '#e11d48' : '#059669';
}

// backendLogin(idToken): Send Firebase ID token to backend for verification; returns JSON response.
async function backendLogin(idToken){
  // call backend to verify token (and create server session if you want)
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify({})
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(json.error || json.message || 'Auth failed');
    return json;
  } catch (err) {
    throw err;
  }
}
    // Note: Do not auto-call redirect on page load; only after successful login.

// Login form submit: perform Firebase auth, backend token verification, then role-based redirect.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailEl.value.trim();
  const password = pwEl.value;

  if (!email || !password) return showMsg('Please enter email and password');

  showMsg('Signing in...', false);

  try {
    // firebaseAuth is initialized in the page as window.firebaseAuth
    if (!window.firebaseAuth) throw new Error('Firebase not initialized');

    const cred = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
    const idToken = await cred.user.getIdToken(true);
    // send token to backend for verification / session creation
    const backendResp = await backendLogin(idToken);
    if (backendResp.ok) {
      localStorage.setItem('skiloora_id_token', idToken);
      // If admin, go straight to Admin dashboard
      if (backendResp.isAdmin) {
        try { localStorage.setItem('skiloora_admin_session', '1'); } catch(_){ }
        window.location.href = '../../admin/html/dashboard.html';
        return;
      }
      // Determine role from Firestore users/{uid}
      let target = './dashboard.html';
      if (window.firebaseDB && window.firebaseAuth?.currentUser) {
        try {
          const snap = await window.firebaseDB.collection('users').doc(window.firebaseAuth.currentUser.uid).get();
          if (snap.exists) {
            const data = snap.data();
            const role = (data.role || '').toLowerCase();
            if (role === 'buyer' || role === 'hirer') target = '../../buyer/html/index.html';
          }
        } catch (e) { console.warn('Role lookup failed', e); }
      }
      window.location.href = target;
    } else {
      showMsg('Login failed: ' + (backendResp.error || 'unknown'));
    }
  } catch (err) {
    console.error('Login error', err);
    showMsg(err.message || 'Login failed');
  }
});
