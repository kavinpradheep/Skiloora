const auth = window.firebaseAuth;
const db = window.firebaseDB;

function letterAvatar(name){
  const letter = (name||'U').charAt(0).toUpperCase();
  const bg='#111827', fg='#ffffff';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><rect width='96' height='96' rx='12' fill='${bg}'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='50' font-family='Arial,Helvetica,sans-serif' fill='${fg}'>${letter}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function setText(id, val){ const el = document.getElementById(id); if(el) el.textContent = val; }

// Compute and render stars from buyer reviews; default to 5.0
async function updateStars(uid){
  const starsEl = document.getElementById('ppStars');
  if (!starsEl) return;
  // Default display to 5 stars in case of no reviews or errors
  starsEl.textContent = '★★★★★ 5.0';
  try{
    const snap = await db.collection('users').doc(uid).collection('reviews').get();
    if (snap.empty){
      // keep default
      return;
    }
    let sum = 0, count = 0;
    snap.forEach(d=>{ const r=d.data(); const s=Number(r.stars||0); if (s>0){ sum+=s; count++; } });
    const avg = count ? Math.round((sum/count)*10)/10 : 5;
    const filled = Math.max(1, Math.round(avg));
    const starsText = '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(filled, 5);
    starsEl.textContent = `${starsText} ${avg.toFixed(1)}`;
  }catch(e){ console.error('Update stars failed', e); /* leave default */ }
}

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
    // Inline stats under About
    setText('ppRateInline', hr ? `₹ ${hr} / Hour` : '—');

    // Message button wiring
    const btnMsg = document.getElementById('btnMessage');
    if (btnMsg){
      const url = (p.contactLink || '').trim();
      if (url){
        const href = url.startsWith('http') ? url : ('https://' + url);
        btnMsg.href = href;
        btnMsg.target = '_blank';
        btnMsg.classList.remove('disabled');
        btnMsg.textContent = 'Message';
      } else {
        btnMsg.removeAttribute('href');
        btnMsg.removeAttribute('target');
        btnMsg.classList.add('disabled');
        btnMsg.textContent = 'Message (link not set)';
      }
    }

    // Stars: compute from buyer reviews; default to 5 if none
    await updateStars(uid);

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

    // Projects count
    try{
      const countSnap = await db.collection('users').doc(uid).collection('projects').get();
      setText('ppProjects', String(countSnap.size || 0));
    }catch(e){ setText('ppProjects','0'); }

    // Response time (placeholder if not tracked)
    setText('ppResponse', p.responseTime || '—');

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
  // Reviews: UI wiring
  const btnShow = document.getElementById('btnShowReview');
  const formWrap = document.getElementById('reviewForm');
  const rfName = document.getElementById('rfName');
  const rfText = document.getElementById('rfText');
  const rfStars = document.getElementById('rfStars');
  const rfCancel = document.getElementById('rfCancel');
  const rfSubmit = document.getElementById('rfSubmit');

  function setStars(n){
    const btns = rfStars ? rfStars.querySelectorAll('button[data-s]') : [];
    btns.forEach(b=>{
      const val = Number(b.getAttribute('data-s'));
      b.textContent = val <= n ? '★' : '☆';
    });
    if (rfStars) rfStars.setAttribute('data-value', String(n));
  }
  rfStars?.querySelectorAll('button[data-s]')?.forEach(btn=>{
    btn.addEventListener('click', ()=> setStars(Number(btn.getAttribute('data-s'))));
  });

  btnShow?.addEventListener('click', ()=>{ if(formWrap) formWrap.style.display = 'block'; });
  rfCancel?.addEventListener('click', ()=>{ if(formWrap) formWrap.style.display = 'none'; });

  async function loadReviews(){
    try{
      const uid = getTargetUid();
      const listEl = document.getElementById('ppReviews');
      if (!uid || !listEl) return;
      listEl.innerHTML = '';
      const snap = await db.collection('users').doc(uid).collection('reviews').orderBy('createdAt','desc').limit(20).get();
      if (snap.empty){
        const p = document.createElement('p'); p.className='muted'; p.textContent='No reviews yet.'; listEl.appendChild(p);
        // keep stars at default handled by updateStars
        return;
      }
      snap.forEach(d=>{
        const r = d.data();
        const card = document.createElement('div'); card.className='review-card';
        const top = document.createElement('div'); top.className='review-top';
        const avatar = document.createElement('div'); avatar.className='avatar small';
        const who = document.createElement('div'); who.className='who';
        const strong = document.createElement('strong'); strong.textContent = r.reviewerName || 'Client';
        const meta = document.createElement('span'); meta.className='muted';
        const daysAgo = r.createdAt && typeof r.createdAt.toDate === 'function' ? Math.max(1, Math.round((Date.now()-r.createdAt.toDate().getTime())/86400000)) : null;
        meta.textContent = `• ${daysAgo ? `${daysAgo} days ago` : ''}`;
        who.appendChild(strong); who.appendChild(meta);
        top.appendChild(avatar); top.appendChild(who);

        const stars = document.createElement('div'); stars.className='review-stars';
        const st = Number(r.stars || 0);
        stars.textContent = '★★★★★'.slice(0, st) + '☆☆☆☆☆'.slice(st, 5);

        const body = document.createElement('p'); body.className='muted'; body.textContent = r.text || '';

        card.appendChild(top); card.appendChild(stars); card.appendChild(body);
        listEl.appendChild(card);
      });
    }catch(e){ console.error('Load reviews failed', e); }
  }

  // Ensure stars render even if auth state is not yet resolved
  const uid = getTargetUid(); if (uid) { updateStars(uid); }

  rfSubmit?.addEventListener('click', async ()=>{
    try{
      const uid = getTargetUid();
      if (!uid){ alert('Profile not found'); return; }
      const me = auth.currentUser;
      const reviewerName = (rfName?.value || '').trim() || (me && (me.displayName || me.email)) || 'User';
      const text = (rfText?.value || '').trim();
      const stars = Number(rfStars?.getAttribute('data-value') || 0);
      if (!reviewerName){ alert('Please enter your name'); return; }
      if (!text || stars < 1){ alert('Please add review text and select stars'); return; }
      await db.collection('users').doc(uid).collection('reviews').add({
        reviewerName, text, stars,
        createdAt: window.firebase && window.firebase.firestore ? window.firebase.firestore.FieldValue.serverTimestamp() : firebase.firestore.FieldValue.serverTimestamp()
      });
      if (formWrap) formWrap.style.display = 'none';
      if (rfText) rfText.value=''; if (rfName) rfName.value=''; setStars(0);
      await loadReviews();
    }catch(e){ console.error('Submit review failed', e); alert('Failed to submit review'); }
  });

  // Initial load
  loadReviews();

  // Issue report wiring (freelancer / buyer viewing profile)
  // Issue reporting moved to freelancer dashboard; no form here.
});