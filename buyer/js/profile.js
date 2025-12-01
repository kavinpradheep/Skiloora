import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// letterAvatar(name): Produce a 64x64 letter-based SVG avatar fallback.
function letterAvatar(name){
  const letter = (name||'U').charAt(0).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='32' fill='#111827'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='28' font-family='Arial,Helvetica,sans-serif' fill='#fff'>${letter}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// render(profile): Fill avatar + display header + form fields with profile data.
function render(profile){
  const fullNameDisp = document.getElementById('fullNameDisp');
  const usernameDisp = document.getElementById('usernameDisp');
  const avatarEl = document.getElementById('avatar');
  fullNameDisp.textContent = profile.name || 'User';
  usernameDisp.textContent = profile.username ? `@${profile.username}` : '@user';
  avatarEl.textContent = '';
  const img = document.createElement('img');
  img.src = profile.avatarUrl ? profile.avatarUrl : letterAvatar(profile.name);
  img.alt = profile.name || 'U';
  img.style.width = '64px';
  img.style.height = '64px';
  img.style.borderRadius = '50%';
  avatarEl.appendChild(img);

  document.getElementById('fullName').value = profile.name || '';
  document.getElementById('username').value = profile.username || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('phone').value = profile.phone || '';
}

// Auth listener: Load user doc; render initial state; wire cancel and form submit.
onAuthStateChanged(window.firebaseAuth, async (user)=>{
  if (!user){ window.location.href='../../freelancer/html/login.html'; return; }
  const ref = doc(window.firebaseDB, 'users', user.uid);
  const snap = await getDoc(ref);
  const profile = snap.exists() ? snap.data() : { email: user.email };
  render(profile);

  document.getElementById('btnCancel').addEventListener('click', ()=>{ window.location.href = './index.html'; });

  document.getElementById('profileForm').addEventListener('submit', async (e)=>{
    // Profile form submit handler: create/update users/{uid} then redirect.
    e.preventDefault();
    const data = {
      name: document.getElementById('fullName').value.trim(),
      username: document.getElementById('username').value.trim().replace(/^@/, ''),
      email: profile.email || user.email,
      phone: document.getElementById('phone').value.trim(),
      role: profile.role || 'buyer'
    };
    try{
      if (snap.exists()){
        await updateDoc(ref, data);
      }else{
        await setDoc(ref, data);
      }
      render(data);
      alert('Profile updated');
      window.location.href = './index.html';
    }catch(err){
      alert('Failed to save profile');
      console.error(err);
    }
  });
});
