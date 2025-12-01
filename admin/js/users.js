(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  if (localStorage.getItem('skiloora_admin_session') !== '1'){ window.location.href = loginUrl; return; }
  
  // Defer all DOM bindings until ready
  document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });

  function setSection(hash){
    const showFreelancers = (hash === '#freelancers' || hash === '' || hash == null);
    document.getElementById('sectionFreelancers').style.display = showFreelancers ? 'block' : 'none';
    document.getElementById('sectionClients').style.display = showFreelancers ? 'none' : 'block';
    document.getElementById('navFreelancers').classList.toggle('active', showFreelancers);
    document.getElementById('navClients').classList.toggle('active', !showFreelancers);
  }
    window.addEventListener('hashchange', ()=> setSection(location.hash));
    setSection(location.hash);

    const freelancerRows = document.getElementById('freelancerRows');
    const clientRows = document.getElementById('clientRows');

  // Moderation modal elements
    const modal = document.getElementById('moderationModal');
    const modClose = document.getElementById('modClose');
    const modSuspend = document.getElementById('modSuspend');
    const modBan = document.getElementById('modBan');
  let currentModUid = null;

    function openMod(uid){ currentModUid = uid; if (modal) modal.style.display='flex'; }
    function closeMod(){ currentModUid = null; if (modal) modal.style.display='none'; }
    modClose?.addEventListener('click', closeMod);

    async function performModeration(action){
    if (!currentModUid) return;
    try{
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/moderation/set`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ uid: currentModUid, action })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'moderation_failed');
      closeMod();
      // Redirect to manage page to review
      window.location.href = './users-manage.html';
    }catch(e){ alert('Failed to update moderation'); }
    }
    modSuspend?.addEventListener('click', ()=> performModeration('suspend'));
    modBan?.addEventListener('click', ()=> performModeration('ban'));

    function renderFreelancerRow(f){
    const row = document.createElement('div'); row.className='row';
    const sub = f.plan ? String(f.plan) : '—';
    const id = f.id || f.uid || '';
    const href = id ? `../../freelancer/html/public-profile.html?uid=${encodeURIComponent(id)}` : '#';
    row.innerHTML = `<div>${f.name||''}</div><div>${f.email||''}</div><div>${f.skills || ''}</div><div><span class="badge">${sub}</span></div><div><a href="${href}" target="_blank" rel="noopener">View</a></div><div class="actions"><button class="chip dark" data-uid="${id}">Suspend</button></div>`;
    freelancerRows.appendChild(row);
    const btn = row.querySelector('button[data-uid]');
    btn?.addEventListener('click', ()=> openMod(id));
    }

    function renderClientRow(c){
    const row = document.createElement('div'); row.className='row';
    const id = c.id || c.uid || '';
    row.innerHTML = `<div>${c.company}</div><div>${c.email}</div><div class="actions"><button class="chip dark" data-uid="${id}">Suspend</button></div>`;
    clientRows.appendChild(row);
    const btn = row.querySelector('button[data-uid]');
    btn?.addEventListener('click', ()=> openMod(id));
    }

    async function loadUsers(){
    try {
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/users-list`, { cache:'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('users_list_failed');
      (json.freelancers || []).forEach(renderFreelancerRow);
      (json.clients || []).forEach(renderClientRow);
    } catch (e) {
      // Fallback demo rows
      [
        { name:'Sarah Johnson', email:'sarah.j@email.com', skills:'React, Node.js, UI/UX', plan:'Premium' },
        { name:'Michael Chen', email:'mchen@email.com', skills:'Python, ML, Data Science', plan:'Premium' }
      ].forEach(renderFreelancerRow);
      [
        { company:'Tech Corp Ltd', email:'contact@techcorp.com' },
        { company:'StartupXYZ', email:'hello@startupzy.com' }
      ].forEach(renderClientRow);
    }
    }
    loadUsers();
  });
})();
