import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query as fsQuery, limit } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// letterAvatar(name): Generate small neutral background letter avatar (unused fallback for user cards).
function letterAvatar(name){
  const letter = (name||'U').charAt(0).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><rect width='32' height='32' rx='16' fill='#e5e7eb'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='14' font-family='Arial,Helvetica,sans-serif' fill='#374151'>${letter}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// renderUserNav(profile): Build signed-in buyer navigation (avatar, name, dropdown with Profile/Logout).
function renderUserNav(profile){
  const nav = document.getElementById('buyerUserNav');
  if (!nav) return;
  nav.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'user-nav';
  const img = document.createElement('img');
  const nameEl = document.createElement('div'); nameEl.className = 'name'; nameEl.textContent = profile.name || 'User';
  const caret = document.createElement('button'); caret.className = 'caret'; caret.textContent = '▾';
  const menu = document.createElement('div'); menu.className = 'user-menu hidden';
  const btnProfile = document.createElement('button'); btnProfile.textContent = 'Profile'; btnProfile.addEventListener('click', ()=>{ window.location.href = './profile.html'; });
  const btnLogout = document.createElement('button'); btnLogout.textContent = 'Logout'; btnLogout.addEventListener('click', async ()=>{ try{ await signOut(window.firebaseAuth); window.location.href='../../freelancer/html/login.html'; }catch(e){} });
  menu.appendChild(btnProfile); menu.appendChild(btnLogout);
  caret.addEventListener('click', (e)=>{ e.stopPropagation(); menu.classList.toggle('hidden'); });
  document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) menu.classList.add('hidden'); });
  img.src = profile.avatarUrl || letterAvatar(profile.name);
  img.alt = profile.name || 'U';
  wrap.appendChild(img); wrap.appendChild(nameEl); wrap.appendChild(caret); wrap.appendChild(menu); nav.appendChild(wrap);
}

// Auth listener: Redirect unauthenticated users; fetch Firestore profile and render nav.
onAuthStateChanged(window.firebaseAuth, async (user)=>{
  if (!user){ window.location.href='../../freelancer/html/login.html'; return; }
  try{ const snap = await getDoc(doc(window.firebaseDB,'users',user.uid)); renderUserNav(snap.exists()?snap.data():{ name:user.email }); }catch(e){ renderUserNav({ name:user.email }); }
});

// Parse query param
const params = new URLSearchParams(window.location.search);
const queryParam = (params.get('q')||'').trim();

// Categories displayed as chips (from screenshot)
const categories = ['UI UX Designing','Web Development','Data Analyst','AI Engineer'];
// Normalization helper
// norm(s): Lowercase + remove separators for consistent matching.
function norm(s){ return (s||'').toLowerCase().replace(/[\s/_-]+/g,''); }

// Synonyms map for broader matching and mapping query->category
const synonyms = {
  uiuxdesigning: ['uiuxdesigner','uiuxdeveloper','uxdesigner','uidesigner','productdesigner'],
  webdevelopment: ['fullstackdeveloper','frontenddeveloper','backenddeveloper','webdeveloper','react','node','javascript','html','css'],
  dataanalyst: ['dataanalyst','businessanalyst','powerbi','tableau','excel','sql'],
  aiengineer: ['aiengineer','machinelearningengineer','mlengineer','deeplearning','tensorflow','pytorch','llm']
};

// Strict role titles per category (normalized)
const roleTitlesByCategory = {
  uiuxdesigning: ['uiuxdesigner','uiuxdeveloper'],
  webdevelopment: ['fullstackdeveloper','frontenddeveloper','backenddeveloper'],
  dataanalyst: ['dataanalyst'],
  aiengineer: ['aiengineer']
};

function categoryFromQuery(q){
  // Map raw query string to internal normalized category key using synonyms.
  const n = norm(q);
  if (!n) return '';
  if (Object.keys(synonyms).includes(n)) return n;
  // Check by category names
  for (const cat of categories){ if (norm(cat) === n) return norm(cat); }
  // Check by synonyms
  for (const [cat, words] of Object.entries(synonyms)){
    if (words.includes(n)) return cat;
  }
  return n; // fallback: use normalized query itself
}

const activeCat = categoryFromQuery(queryParam);

const chipsWrap = document.getElementById('roleChips');
categories.forEach(r=>{
  const chip = document.createElement('button');
  chip.className = 'role-chip alt';
  chip.textContent = r;
  if (activeCat && norm(r) === activeCat) chip.classList.add('active');
  chip.addEventListener('click', ()=>{ window.location.href = `./search.html?q=${encodeURIComponent(r)}`; });
  chipsWrap.appendChild(chip);
});

// Load freelancers from Firestore and filter by selected role
const cardsWrap = document.getElementById('resultCards');
let currentList = [];
let sortMode = 'newest'; // 'newest' | 'rating' | 'name'
const ratingCache = new Map();

function getFavorites(){
  const favKey = 'buyer.favorites';
  try{
    const arr = JSON.parse(localStorage.getItem(favKey) || '[]');
    return Array.isArray(arr) ? new Set(arr) : new Set();
  }catch(_){ return new Set(); }
}

async function computeRatings(list){
  const items = Array.isArray(list) ? list : [];
  const jobs = items.map(async (u)=>{
    if (!u.uid) return;
    if (ratingCache.has(u.uid)) { u.ratingAvg = ratingCache.get(u.uid); return; }
    const avg = await fetchAverageRating(u.uid).catch(()=>5.0);
    ratingCache.set(u.uid, avg);
    u.ratingAvg = avg;
  });
  await Promise.allSettled(jobs);
}

function applySort(list){
  const arr = [...(list||[])];
  // Bring favorites to the top only when no role/category filter is active
  if (!activeCat){
    const favs = getFavorites();
    arr.sort((a,b)=>{
      const af = a.uid && favs.has(a.uid) ? 1 : 0;
      const bf = b.uid && favs.has(b.uid) ? 1 : 0;
      return bf - af; // favored first
    });
  }
  if (sortMode === 'newest'){
    // Sort by createdAt (desc); fallback to uid string order
    arr.sort((a,b)=>{
      const av = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : 0;
      const bv = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : 0;
      return bv - av;
    });
  } else if (sortMode === 'name'){
    arr.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')));
  } else if (sortMode === 'rating'){
    arr.sort((a,b)=>{
      const ar = typeof a.ratingAvg === 'number' ? a.ratingAvg : 0;
      const br = typeof b.ratingAvg === 'number' ? b.ratingAvg : 0;
      return br - ar;
    });
  }
  // Note: rating sort would require async fetches; keep UI simple for now
  return arr;
}
async function fetchAverageRating(uid){
  try{
    const col = collection(window.firebaseDB, 'users', uid, 'reviews');
    const snap = await getDocs(col);
    if (snap.empty) return 5.0; // default to 5 if no reviews
    let sum = 0, count = 0;
    snap.forEach(d=>{ const r=d.data(); const s=Number(r.stars||0); if (s>0){ sum+=s; count++; } });
    return count ? Math.round((sum/count)*10)/10 : 5.0;
  }catch(e){ console.error('rating_fetch_failed', e); return 5.0; }
}

function renderStarText(val){
  const filled = Math.max(1, Math.round(val));
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(filled, 5) + ' ' + Number(val).toFixed(1);
}

function renderCards(list){
  cardsWrap.innerHTML='';
  if (!list || list.length === 0){
    const empty = document.createElement('div');
    empty.style.color = '#6b7280';
    empty.style.fontSize = '14px';
    empty.textContent = 'No freelancers found for the selected role.';
    cardsWrap.appendChild(empty);
    return;
  }
  // Favorites store
  const favKey = 'buyer.favorites';
  const favsSet = getFavorites();

  list.forEach(c=>{
    const card = document.createElement('div'); card.className='result-card';
    const head = document.createElement('div'); head.className='rc-head';
    const av = document.createElement('div'); av.className='rc-avatar'; av.textContent = (c.name||'U').charAt(0).toUpperCase();
    const info = document.createElement('div'); info.className='rc-info';
    const name = document.createElement('div'); name.className='rc-name'; name.textContent = c.name || c.username || 'Freelancer';
    const badge = document.createElement('div'); badge.className='rc-badge'; badge.innerHTML = `${c.title || c.roleLong || 'Pro Client'} <span style='font-size:11px'>${c.country? '🇮🇳 '+c.country : ''}</span>`;
    info.appendChild(name); info.appendChild(badge);
    const fav = document.createElement('button'); fav.className='rc-fav';
    const isFav = c.uid && favsSet.has(c.uid);
    fav.textContent = isFav ? '♥' : '♡';
    fav.style.color = isFav ? '#e11d48' : '#6b7280';
    fav.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    head.appendChild(av); head.appendChild(info); head.appendChild(fav);
    const desc = document.createElement('p'); desc.className='rc-desc'; desc.textContent = c.desc || c.bio || 'Connect with top freelancers to turn goals into success. Find the perfect talent.';
    const stars = document.createElement('div'); stars.className='rc-stars';
    // Default optimistic rating while loading
    const initial = typeof c.ratingAvg === 'number' ? c.ratingAvg : (typeof c.rating === 'number' ? c.rating : 5.0);
    stars.textContent = renderStarText(initial);
    if (c.uid){
      // Compute average from buyer reviews and update asynchronously
      fetchAverageRating(c.uid).then(avg=>{ stars.textContent = renderStarText(avg); c.ratingAvg = avg; ratingCache.set(c.uid, avg); }).catch(()=>{});
    }
    const actions = document.createElement('div'); actions.className='rc-actions';
    const btnMsg = document.createElement('button'); btnMsg.className='rc-btn'; btnMsg.textContent='✉';
    const btnProfile = document.createElement('button'); btnProfile.className='rc-btn'; btnProfile.textContent='See profile';
    if (c.uid){
      fav.addEventListener('click', ()=>{
        let cur;
        try { const arr = JSON.parse(localStorage.getItem(favKey) || '[]'); cur = Array.isArray(arr) ? arr : []; } catch(_) { cur = []; }
        const idx = cur.indexOf(c.uid);
        if (idx === -1) { cur.push(c.uid); fav.textContent='♥'; fav.style.color='#e11d48'; fav.title='Remove from favorites'; }
        else { cur.splice(idx,1); fav.textContent='♡'; fav.style.color='#6b7280'; fav.title='Add to favorites'; }
        try { localStorage.setItem(favKey, JSON.stringify(cur)); } catch(_) {}
        // Re-apply sorting; favorites-first applies only when no category filter
        renderCards(applySort(currentList));
      });
      btnProfile.addEventListener('click', ()=>{
        const origin = location.origin.replace(/\/$/, '');
        window.location.href = `${origin}/freelancer/html/public-profile.html?uid=${encodeURIComponent(c.uid)}`;
      });
    }
    actions.appendChild(btnMsg); actions.appendChild(btnProfile);
    card.appendChild(head); card.appendChild(desc); card.appendChild(stars); card.appendChild(actions);
    cardsWrap.appendChild(card);
  });
}

async function loadFreelancers(selected){
  // Fetch up to 200 users, filter freelance users by selected category (title first, skills fallback) then render.
  try{
    const col = collection(window.firebaseDB, 'users');
    // Fetch users and filter client-side for role=freelancer (case-insensitive)
    const snap = await getDocs(fsQuery(col, limit(200)));
    const all = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const onlyFreelancers = all.filter(u => {
      const rv = String(u.role||'').toLowerCase().trim();
      return rv === 'freelancer' || (rv !== 'buyer' && (u.title || (Array.isArray(u.skills) && u.skills.length))); 
    });

    const selNorm = norm(selected);
    const cat = categoryFromQuery(selected);
    const allowedTitles = new Set(roleTitlesByCategory[cat] || []);
    const auxTokens = new Set(synonyms[cat] || []);

    const filtered = selNorm
      ? onlyFreelancers.filter(u => {
          const normalizedTitle = norm(u.title || u.roleLong || '');
          // If the user has an explicit title, require a strict match to the selected category
          if (normalizedTitle) {
            return allowedTitles.has(normalizedTitle);
          }
          // Otherwise, fall back to skills/tags intersection for users without a title
          const terms = [];
          if (Array.isArray(u.skills)) terms.push(...u.skills.map(norm));
          if (Array.isArray(u.tags)) terms.push(...u.tags.map(norm));
          return terms.some(t => auxTokens.has(t));
        })
      : onlyFreelancers;
    currentList = filtered;
    renderCards(applySort(currentList));
  }catch(err){
    console.error('Failed to load freelancers', err);
    renderCards([]);
  }
}

loadFreelancers(queryParam);

// Price range filters removed

// Sorting UI
const sortBtn = document.getElementById('sortBtn');
if (sortBtn){
  const wrap = document.createElement('span');
  wrap.style.position = 'relative';
  const parent = sortBtn.parentElement; if (parent){ parent.insertBefore(wrap, sortBtn); wrap.appendChild(sortBtn); }
  const menu = document.createElement('div');
  menu.style.position='absolute'; menu.style.top='120%'; menu.style.right='0';
  menu.style.background='#fff'; menu.style.border='1px solid #e5e7eb'; menu.style.borderRadius='8px'; menu.style.boxShadow='0 8px 20px rgba(0,0,0,0.08)';
  menu.style.padding='6px'; menu.style.minWidth='180px'; menu.style.display='none';
  function addItem(label, mode){
    const b = document.createElement('button');
    b.textContent = label; b.style.display='block'; b.style.width='100%'; b.style.textAlign='left';
    b.style.padding='8px 10px'; b.style.border='none'; b.style.background='transparent'; b.style.cursor='pointer'; b.style.borderRadius='6px';
    b.addEventListener('mouseover', ()=>{ b.style.background='#f3f4f6'; });
    b.addEventListener('mouseout', ()=>{ b.style.background='transparent'; });
    b.addEventListener('click', async ()=>{
      sortMode = mode; sortBtn.textContent = `Short by: ${label} ▾`;
      menu.style.display='none';
      if (mode === 'rating'){
        await computeRatings(currentList);
      }
      renderCards(applySort(currentList));
    });
    menu.appendChild(b);
  }
  addItem('Newest', 'newest');
  addItem('Name (A-Z)', 'name');
  addItem('Top Rated', 'rating');
  wrap.appendChild(menu);
  sortBtn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.style.display = (menu.style.display==='none'||!menu.style.display) ? 'block' : 'none'; });
  document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) menu.style.display='none'; });
}

// Global search bar enter navigation
const globalSearch = document.getElementById('globalSearch');
if (globalSearch){
  globalSearch.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ const val = globalSearch.value.trim(); if (val) window.location.href = `./search.html?q=${encodeURIComponent(val)}`; }});
}
