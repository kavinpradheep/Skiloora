const auth = window.firebaseAuth;
const db = window.firebaseDB;

function letterAvatar(name){
  const letter = (name||'U').charAt(0).toUpperCase();
  const bg='#111827', fg='#ffffff';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><rect width='96' height='96' rx='12' fill='${bg}'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='50' font-family='Arial,Helvetica,sans-serif' fill='${fg}'>${letter}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function setText(id, val){ const el = document.getElementById(id); if(el) el.textContent = val; }

// Load by explicit uid (for buyer view) or fallback to current user
function getTargetUid(){
  const uid = new URLSearchParams(location.search).get('uid');
  return uid || (auth.currentUser && auth.currentUser.uid) || '';
}

auth.onAuthStateChanged(async (user)=>{
  const uid = getTargetUid();
  if(!uid){ setText('ppName','Profile not found'); return; }
  try{
    const doc = await db.collection('users').doc(uid).get();
    const p = doc.exists ? doc.data() : {};
    const name = p.name || p.fullName || (user && (user.displayName||user.email)) || 'User';
    const avatarEl = document.getElementById('ppAvatar');
    if (p.avatarUrl) { avatarEl.src = p.avatarUrl; avatarEl.alt = name; } else { avatarEl.src = letterAvatar(name); avatarEl.alt = name.charAt(0).toUpperCase(); }
    setText('ppName', name);
    setText('ppNameAbout', name);
    setText('ppRole', p.title || p.roleLong || (p.isFreelancer? 'Freelancer' : '') || '');
    setText('ppLocation', p.location || p.country || '');
    const hr = p.hourlyRate || p.rate; setText('ppRate', hr ? `₹ ${hr} / Hour` : '');
    setText('ppBio', p.bio || p.desc || '');

    // Stars placeholder (no rating backend yet)
    const stars = document.getElementById('ppStars');
    if (stars) stars.textContent = '★ ★ ★ ★ ☆ 4.0';

    // Works (projects)
    const works = document.getElementById('ppWorks');
    if (works){
      const snap = await db.collection('users').doc(uid).collection('projects').orderBy('createdAt','desc').limit(4).get();
      if (snap.empty){
        for(let i=0;i<4;i++){ const ph=document.createElement('div'); ph.className='card-ph'; works.appendChild(ph); }
      } else {
        snap.forEach(d=>{
          const pjt = d.data();
          const ph = document.createElement('div'); ph.className='card-ph'; ph.style.backgroundImage = pjt.imageUrl ? `url(${pjt.imageUrl})` : '';
          ph.style.backgroundSize='cover'; ph.style.backgroundPosition='center';
          works.appendChild(ph);
        });
      }
    }

    // Links (social icons)
    const links = document.getElementById('ppLinks');
    if (links){
      const socials = p.socials || { github: p.github, behance: p.behance, dribbble: p.dribbble, linkedin: p.linkedin };
      const ordered = ['github','behance','dribbble','linkedin'];
      ordered.forEach(k=>{
        const url = socials[k];
        if(url){ const a=document.createElement('a'); a.href=url.startsWith('http')?url:'https://'+url; a.target='_blank'; a.title=k; a.textContent = k[0].toUpperCase(); links.appendChild(a); }
      });
    }
  }catch(e){ console.error('Load public profile failed', e); }
});

// Scrollable tab navigation
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tabs .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});