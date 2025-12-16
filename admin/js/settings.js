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
  // Remove confirm modal elements
  const rmModal = document.getElementById('confirmRemoveModal');
  const rmName = document.getElementById('rmAdminName');
  const rmClose = document.getElementById('rmClose');
  const rmCancel = document.getElementById('rmCancel');
  const rmConfirm = document.getElementById('rmConfirm');
  const rmBackdrop = document.getElementById('backdropRm');
  let pendingRemove = null;

  function getModal(){ return document.getElementById('addAdminModal'); }
  function openModal(){ const m = getModal(); if (m) m.classList.remove('hidden'); setTimeout(()=>{ nameEl?.focus(); }, 10); }
  function closeModal(){ const m = getModal(); if (m) m.classList.add('hidden'); }
  btnAdd?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  document.getElementById('backdropAddAdmin')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });

  function renderAdmins(list){
    if (!cardsWrap) return;
    cardsWrap.innerHTML = '';
    if (!list || list.length === 0){
      const p = document.createElement('p'); p.className='muted'; p.textContent='No admins yet.'; cardsWrap.appendChild(p); return;
    }
    list.forEach(a=>{
      const name = a.name || a.email || 'Admin';
      const email = a.email || '';
      const initial = (name || email).trim().charAt(0).toUpperCase() || 'A';
      const card = document.createElement('div'); card.className='admin-card';
      const avatar = document.createElement('div'); avatar.className='admin-avatar'; avatar.textContent = initial;
      const meta = document.createElement('div'); meta.className='admin-meta';
      const title = document.createElement('div'); title.className='admin-name'; title.textContent = name;
      const sub = document.createElement('div'); sub.className='admin-email'; sub.textContent = email;
      meta.appendChild(title); meta.appendChild(sub);
      const content = document.createElement('div'); content.className='admin-content';
      content.appendChild(avatar); content.appendChild(meta);
      const badges = document.createElement('div'); badges.className='admin-badges';
      const roleBadge = document.createElement('div'); roleBadge.className='badge'; roleBadge.textContent = 'Admin';
      badges.appendChild(roleBadge);
      if (a.isDefault){ const def = document.createElement('div'); def.className='badge'; def.textContent='Default'; badges.appendChild(def); }
      const actions = document.createElement('div'); actions.className='admin-actions';
      const btnRemove = document.createElement('button'); btnRemove.className='btn-ghost'; btnRemove.textContent='Remove';
      if (a.isDefault){ btnRemove.disabled = true; btnRemove.title = 'Cannot remove default admin'; }
      actions.appendChild(btnRemove);

      // Wire actions
      btnRemove.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        if (a.isDefault) return;
        pendingRemove = { uid: a.uid, email, name };
        if (rmName) rmName.textContent = name || email || 'this admin';
        rmModal?.classList.remove('hidden');
      });
      // Toggle actions when clicking the card
      card.addEventListener('click', ()=>{
        // Close others
        document.querySelectorAll('.admin-card.show-actions').forEach(el => { if (el !== card) el.classList.remove('show-actions'); });
        card.classList.toggle('show-actions');
      });

      card.appendChild(badges); card.appendChild(content); card.appendChild(actions);
      cardsWrap.appendChild(card);
    });
  }

  // Remove modal handlers
  function closeRemove(){ rmModal?.classList.add('hidden'); pendingRemove = null; }
  rmClose?.addEventListener('click', closeRemove);
  rmCancel?.addEventListener('click', closeRemove);
  rmBackdrop?.addEventListener('click', closeRemove);
  document.addEventListener('keydown', (e)=>{ if (!rmModal?.classList.contains('hidden') && e.key==='Escape') closeRemove(); });
  rmConfirm?.addEventListener('click', async ()=>{
    if (!pendingRemove) return;
    try{
      const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
      rmConfirm.disabled = true; rmConfirm.textContent = 'Removing…';
      const res = await fetch(`${API_ORIGIN}/api/admin/admin-delete`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ uid: pendingRemove.uid, email: pendingRemove.email }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error||'delete_failed');
      closeRemove();
      await loadAdmins();
    }catch(e){ alert('Failed to remove admin'); }
    finally{ rmConfirm.disabled = false; rmConfirm.textContent = 'Remove'; }
  });

  async function loadAdmins(){
    try{
      const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
      const res = await fetch(`${API_ORIGIN}/api/admin/admins`, { cache:'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('admins_list_failed');
      renderAdmins(json.items || []);
    }catch(e){ renderAdmins([]); }
  }

  function setError(elField, elErr, msg){
    if (!elField || !elErr) return;
    if (msg){ elField.classList.add('invalid'); elErr.textContent = msg; elErr.style.display='block'; }
    else { elField.classList.remove('invalid'); elErr.textContent=''; elErr.style.display='none'; }
  }
  const errName = document.getElementById('errName');
  const errEmail = document.getElementById('errEmail');
  const errPw = document.getElementById('errPw');
  const fieldName = document.getElementById('fieldName');
  const fieldEmail = document.getElementById('fieldEmail');
  const fieldPw = document.getElementById('fieldPassword');

  let submitAttempted = false;
  function validate(forceShow){
    const name = (nameEl?.value || '').trim();
    const email = (emailEl?.value || '').trim();
    const password = (pwEl?.value || '').trim();
    let ok = true;
    const show = Boolean(forceShow || submitAttempted);
    const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (show){
      setError(fieldName, errName, name ? '' : 'Name is required'); if (!name) ok = false;
      setError(fieldEmail, errEmail, mailOk ? '' : 'Enter a valid email'); if (!mailOk) ok = false;
      setError(fieldPw, errPw, password.length >= 6 ? '' : 'Password must be at least 6 characters'); if (password.length < 6) ok = false;
    } else {
      // Do not display errors yet
      setError(fieldName, errName, '');
      setError(fieldEmail, errEmail, '');
      setError(fieldPw, errPw, '');
    }
    // Logical validation outcome independent of showing
    if (!name) ok = false;
    if (!mailOk) ok = false;
    if (password.length < 6) ok = false;
    return ok;
  }

  document.getElementById('togglePw')?.addEventListener('click', ()=>{
    if (!pwEl) return;
    const t = pwEl.getAttribute('type') === 'password' ? 'text' : 'password';
    pwEl.setAttribute('type', t);
  });

  async function createAdmin(){
    const name = (nameEl?.value || '').trim();
    const email = (emailEl?.value || '').trim();
    const password = (pwEl?.value || '').trim();
    submitAttempted = true;
    if (!validate(true)) return;
    try{
// Use local backend if running locally, otherwise use current origin
      let backend;
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        backend = 'http://localhost:5000';
      } else {
        backend = location.origin.replace(/\/$/, '');
      }
      const btn = document.getElementById('saveAddAdmin');
      const prev = btn?.textContent;
      if (btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
      const res = await fetch(`${backend}/api/admin/create-admin`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const json = await res.json();
      if (!res.ok || !json.ok){
        if (json && (json.error === 'email_exists')){
          setError(fieldEmail, errEmail, 'This email is already an admin');
          if (btn){ btn.disabled=false; btn.textContent = prev || 'Save'; }
          return;
        }
        if (json && (json.error === 'email_in_use_by_user' || json.error === 'email_in_use')){
          setError(fieldEmail, errEmail, 'This email is already used by a user account');
          if (btn){ btn.disabled=false; btn.textContent = prev || 'Save'; }
          return;
        }
        throw new Error(json && json.error || 'create_failed');
      }
      closeModal();
      if (nameEl) nameEl.value='';
      if (emailEl) emailEl.value='';
      if (pwEl) pwEl.value='';
      await loadAdmins();
      alert('Admin added successfully');
      submitAttempted = false;
    }catch(err){ alert('Failed to add admin'); }
    finally{ const btn = document.getElementById('saveAddAdmin'); if (btn){ btn.disabled=false; btn.textContent = prev || 'Save'; } }
  }
  saveBtn?.addEventListener('click', createAdmin);
  // Only re-validate on input after a submit attempt, so errors appear on submit first
  [nameEl, emailEl, pwEl].forEach(el => el?.addEventListener('input', ()=>{ if (submitAttempted) validate(true); }));
  [nameEl, emailEl, pwEl].forEach(el => el?.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); createAdmin(); }}));

  loadAdmins();
});
