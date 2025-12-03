// login.js (Firebase compat SDK)

const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const pwEl = document.getElementById('password');
const msg = document.getElementById('msg');
const forgotToggle = document.getElementById('forgotToggle');
const forgotPanel = document.getElementById('forgotPanel');
const forgotWrap = document.querySelector('.forgot-wrap');
const forgotSend = document.getElementById('forgotSend');
const forgotCancel = document.getElementById('forgotCancel');
const forgotMsg = document.getElementById('forgotMsg');

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

      // Prefer Firestore profile role to determine destination
      let role = '';
      try {
        if (window.firebaseDB && window.firebaseAuth?.currentUser) {
          const snap = await window.firebaseDB.collection('users').doc(window.firebaseAuth.currentUser.uid).get();
          if (snap.exists) role = String((snap.data().role||'')).toLowerCase().trim();
        }
      } catch (e) { console.warn('Role lookup failed', e); }

      if (role === 'admin') {
        try { localStorage.setItem('skiloora_admin_session', '1'); } catch(_){ }
        window.location.href = '../../admin/html/dashboard.html';
        return;
      }
      if (role === 'buyer' || role === 'hirer') {
        window.location.href = '../../buyer/html/index.html';
        return;
      }

      // Fallback: if no role found, use backend admin flag
      if (!role && backendResp.isAdmin) {
        try { localStorage.setItem('skiloora_admin_session', '1'); } catch(_){ }
        window.location.href = '../../admin/html/dashboard.html';
        return;
      }

      // Default: freelancer dashboard
      window.location.href = './dashboard.html';
    } else {
      showMsg('Login failed: ' + (backendResp.error || 'unknown'));
    }
  } catch (err) {
    console.error('Login error', err);
    showMsg(err.message || 'Login failed');
    // Show forgot password option on typical credential errors
    const code = err && err.code ? String(err.code) : '';
    const show = code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-credential');
    if (show && forgotWrap){ forgotWrap.removeAttribute('hidden'); }
  }
});

// Forgot password toggle and submit
if (forgotToggle && forgotPanel){
  forgotToggle.addEventListener('click', ()=>{
    const isHidden = forgotPanel.hasAttribute('hidden');
    if (isHidden){ forgotPanel.removeAttribute('hidden'); forgotToggle.setAttribute('aria-expanded','true'); }
    else { forgotPanel.setAttribute('hidden',''); forgotToggle.setAttribute('aria-expanded','false'); }
  });
}
forgotCancel?.addEventListener('click', ()=>{ forgotPanel?.setAttribute('hidden',''); forgotToggle?.setAttribute('aria-expanded','false'); });
if (forgotSend){
  forgotSend.addEventListener('click', async ()=>{
    const email = (emailEl?.value||'').trim();
    if (!email){ if(forgotMsg) forgotMsg.textContent='Please enter your email above.'; return; }
    try{
      if (!window.firebaseAuth) throw new Error('Firebase not initialized');
      // Validate email exists either in Auth or Firestore profile
      if(forgotMsg) forgotMsg.textContent='Checking account...';
      let exists = false;
      try{
        const methods = await window.firebaseAuth.fetchSignInMethodsForEmail(email);
        exists = Array.isArray(methods) && methods.length > 0;
      }catch(_){ exists = false; }
      if (!exists && window.firebaseDB){
        try{
          const qs = await window.firebaseDB.collection('users').where('email','==',email).limit(1).get();
          exists = !qs.empty;
        }catch(_){ /* ignore */ }
      }
      if (!exists){ if(forgotMsg) forgotMsg.textContent='No account found for this email.'; return; }
      if(forgotMsg) forgotMsg.textContent='Sending reset email...';
      await window.firebaseAuth.sendPasswordResetEmail(email);
      if(forgotMsg) forgotMsg.textContent='Reset link sent. Check your inbox.';
      setTimeout(()=>{ forgotPanel?.setAttribute('hidden',''); forgotToggle?.setAttribute('aria-expanded','false'); }, 2000);
    }catch(e){ console.error('Reset email error', e); if(forgotMsg) forgotMsg.textContent='Failed to send reset email.'; }
  });
}
