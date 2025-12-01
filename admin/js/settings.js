// Early auth gate (no DOM required)
(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  if (localStorage.getItem('skiloora_admin_session') !== '1'){
    window.location.href = loginUrl;
    return;
  }
})();

// Defer DOM access until content is loaded to avoid nulls
document.addEventListener('DOMContentLoaded', function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;

  // Logout binding
  const logoutBtn = document.getElementById('adminLogout');
  logoutBtn?.addEventListener('click', ()=>{
    localStorage.removeItem('skiloora_admin_session');
    window.location.href = loginUrl;
  });

  function setSettingsSection(hash){
    const showRoles = (hash === '#roles' || hash === '' || hash == null);
    const roles = document.getElementById('sectionRoles');
    const prefs = document.getElementById('sectionPrefs');
    const navRoles = document.getElementById('navRoles');
    const navPrefs = document.getElementById('navPrefs');
    if (roles) roles.style.display = showRoles ? 'block' : 'none';
    if (prefs) prefs.style.display = showRoles ? 'none' : 'block';
    navRoles?.classList.toggle('active', showRoles);
    navPrefs?.classList.toggle('active', !showRoles);
  }
  window.addEventListener('hashchange', ()=> setSettingsSection(location.hash));
  setSettingsSection(location.hash);

  // Admins management
  const cardsWrap = document.getElementById('adminCards');
  const btnAdd = document.getElementById('btnAddAdmin');
  const closeBtn = document.getElementById('closeAddAdmin');
  const cancelBtn = document.getElementById('cancelAddAdmin');
  const saveBtn = document.getElementById('saveAddAdmin');
  const nameEl = document.getElementById('adminName');
  const emailEl = document.getElementById('adminEmail');
  const pwEl = document.getElementById('adminPassword');

  function getModal(){ return document.getElementById('addAdminModal'); }
  function openModal(){ const m = getModal(); if (m) m.style.display='flex'; }
  function closeModal(){ const m = getModal(); if (m) m.style.display='none'; }
  btnAdd?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  function renderAdmins(list){
    if (!cardsWrap) return;
    cardsWrap.innerHTML = '';
    if (!list || list.length === 0){
      const p = document.createElement('p'); p.className='muted'; p.textContent='No admins yet.'; cardsWrap.appendChild(p); return;
    }
    list.forEach(a=>{
      const card = document.createElement('div'); card.className='card';
      const title = document.createElement('div'); title.style.fontWeight='600'; title.textContent = a.name || a.email || 'Admin';
      const sub = document.createElement('div'); sub.className='muted'; sub.textContent = a.email || '';
      const badge = document.createElement('div'); badge.className='badge'; badge.textContent = a.isDefault ? 'Default Admin' : 'Admin';
      badge.style.marginTop='6px';
      card.appendChild(title); card.appendChild(sub); card.appendChild(badge);
      cardsWrap.appendChild(card);
    });
  }

  async function loadAdmins(){
    try{
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/admins`, { cache:'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('admins_list_failed');
      renderAdmins(json.items || []);
    }catch(e){ renderAdmins([]); }
  }

  async function createAdmin(){
    const name = (nameEl?.value || '').trim();
    const email = (emailEl?.value || '').trim();
    const password = (pwEl?.value || '').trim();
    if (!name || !email || !password){ alert('Please fill all fields'); return; }
    try{
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/create-admin`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const json = await res.json();
      if (!res.ok || !json.ok){ throw new Error(json.error || 'create_failed'); }
      closeModal();
      if (nameEl) nameEl.value='';
      if (emailEl) emailEl.value='';
      if (pwEl) pwEl.value='';
      await loadAdmins();
      alert('Admin added successfully');
    }catch(err){ alert('Failed to add admin'); }
  }
  saveBtn?.addEventListener('click', createAdmin);

  loadAdmins();
});
