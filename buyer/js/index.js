import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

function letterAvatar(name){
  const letter = (name||'U').charAt(0).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><rect width='32' height='32' rx='16' fill='#111827'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='16' font-family='Arial,Helvetica,sans-serif' fill='#fff'>${letter}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

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

onAuthStateChanged(window.firebaseAuth, async (user)=>{
  if (!user){ window.location.href='../../freelancer/html/login.html'; return; }
  try{
    const snap = await getDoc(doc(window.firebaseDB, 'users', user.uid));
    const profile = snap.exists() ? snap.data() : { name: user.email };
    renderUserNav(profile);
  }catch(e){ renderUserNav({ name: user.email }); }
});
