
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase and expose to window for legacy code compatibility
const app = initializeApp(firebaseConfig);
window.firebaseAuth = getAuth(app);
window.firebaseDB = getFirestore(app);

// letterAvatar(name): Generate circular SVG avatar (data URI) using first letter.
function letterAvatar(name){
  const letter = (name||'U').charAt(0).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><rect width='32' height='32' rx='16' fill='#111827'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='16' font-family='Arial,Helvetica,sans-serif' fill='#fff'>${letter}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// renderUserNav(profile): Build user nav (avatar, name, dropdown actions) dynamically.
function renderUserNav(profile){
  const nav = document.getElementById('buyerUserNav');
  if (!nav) return;
  nav.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'user-nav';
  const img = document.createElement('img');
  const nameEl = document.createElement('div'); nameEl.className = 'name'; nameEl.textContent = profile.name || 'User';
  const caret = document.createElement('button'); caret.className = 'caret'; caret.setAttribute('aria-label','Menu'); caret.textContent = '▾';
  const menu = document.createElement('div'); menu.className = 'user-menu hidden';
  const btnProfile = document.createElement('button'); btnProfile.textContent = 'Profile'; btnProfile.addEventListener('click', (e)=>{ e.stopPropagation(); window.location.href = '../html/profile.html'; });
  const btnLogout = document.createElement('button'); btnLogout.textContent = 'Logout'; btnLogout.addEventListener('click', async ()=>{ try{ await signOut(window.firebaseAuth); window.location.href = '../../freelancer/html/login.html'; }catch(e){} });
  menu.appendChild(btnProfile);
  menu.appendChild(btnLogout);
  caret.addEventListener('click', (e)=>{ e.stopPropagation(); const isHidden = menu.classList.contains('hidden'); menu.classList.toggle('hidden', !isHidden); });
  document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) menu.classList.add('hidden'); });
  img.src = profile.avatarUrl ? profile.avatarUrl : letterAvatar(profile.name);
  img.alt = profile.name || 'U';
  wrap.appendChild(img); wrap.appendChild(nameEl); wrap.appendChild(caret); wrap.appendChild(menu);
  nav.appendChild(wrap);
}

// Auth listener: Redirect if unauthenticated; fetch Firestore profile; render nav.
onAuthStateChanged(window.firebaseAuth, async (user)=>{
  if (!user){ window.location.href='../../freelancer/html/login.html'; return; }
  try{
    // Check admin via backend; redirect admins out of buyer area
    try{
      const idToken = await user.getIdToken(true);
      const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
      const resp = await fetch(API_ORIGIN + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
        body: JSON.stringify({})
      });
      const json = await resp.json().catch(()=>({}));
      if (resp.ok && json.isAdmin){
        try { localStorage.setItem('skiloora_admin_session', '1'); } catch(_){ }
        window.location.href = '../../admin/html/dashboard.html';
        return;
      }
    }catch(_){ /* ignore and continue */ }

    const snap = await getDoc(doc(window.firebaseDB, 'users', user.uid));
    const profile = snap.exists() ? snap.data() : { name: user.email };

    // Role guard: prevent freelancers from viewing buyer pages
    const role = (profile.role || profile.userType || '').toLowerCase();
    const isBuyer = profile.isBuyer === true || profile.isHirer === true || role === 'buyer' || role === 'hirer';
    const isFreelancer = profile.isFreelancer === true || role === 'freelancer';
    if (!isBuyer && isFreelancer){
      window.location.href = '../../freelancer/html/dashboard.html';
      return;
    }
    renderUserNav(profile);

    // Issue form wiring (requires auth user)
    setupBuyerIssueForm(user);
  }catch(e){ renderUserNav({ name: user.email }); }
});

// Role dropdown navigation
const form = document.getElementById('roleSearchForm');
const roleSelect = document.getElementById('roleSelect');
if (form && roleSelect){
  // navigate(role): Send user to search page with role query.
  const navigate = (role)=>{
    if (!role) return;
    window.location.href = `./search.html?q=${encodeURIComponent(role)}`;
  };
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const val = (roleSelect.value || '').trim();
    navigate(val);
  });
}

// ---------------- Issue Reporting (Buyer) ----------------
async function setupBuyerIssueForm(user){
  const subjectEl = document.getElementById('biSubject');
  const priorityEl = document.getElementById('biPriority');
  const descEl = document.getElementById('biDescription');
  const submitBtn = document.getElementById('biSubmit');
  const msgEl = document.getElementById('biMsg');
  if (!submitBtn) return;
  submitBtn.addEventListener('click', async ()=>{
    if (!user){ alert('Not authenticated'); return; }
    const subject = (subjectEl?.value||'').trim();
    const priority = (priorityEl?.value||'low').trim();
    const description = (descEl?.value||'').trim();
    if (!subject || !description){ msgEl.textContent='Please fill subject and description.'; return; }
    msgEl.textContent='Submitting...';
    try{
      const idToken = await user.getIdToken(true);
      const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
      const resp = await fetch(API_ORIGIN + '/api/issues/report', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+idToken },
        body: JSON.stringify({ subject, priority, description })
      });
      const json = await resp.json().catch(()=>({}));
      if (!resp.ok || !json.ok){ throw new Error(json.error||'submit_failed'); }
      subjectEl.value=''; descEl.value=''; priorityEl.value='low';
      msgEl.textContent='Issue reported successfully.';
      setTimeout(()=>{ msgEl.textContent=''; }, 3000);
    }catch(e){ console.error('Issue submit failed', e); msgEl.textContent='Failed to submit issue.'; }
  });
}
