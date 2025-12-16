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
    const countFreelancers = document.getElementById('countFreelancers');
    const countClients = document.getElementById('countClients');
    const topSearch = document.querySelector('.admin-topbar .search');
    let freelancersData = [];
    let clientsData = [];

  // Moderation modal elements
    const modal = document.getElementById('moderationModal');
    const modClose = document.getElementById('modClose');
    const modSuspend = document.getElementById('modSuspend');
    const modBan = document.getElementById('modBan');
  let currentModUid = null;

    function openMod(uid){ currentModUid = uid; if (modal) modal.style.display='flex'; }
    function closeMod(){ currentModUid = null; if (modal) modal.style.display='none'; }
    modClose?.addEventListener('click', closeMod);

    const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
    async function performModeration(action){
    if (!currentModUid) return;
    try{
      const res = await fetch(`${API_ORIGIN}/api/admin/moderation/set`, {
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
      row.dataset.search = `${(f.name||'')} ${(f.email||'')} ${(f.skills||'')} ${sub}`.toLowerCase();
      row.innerHTML = `
        <div class="cell" data-col="Name">${f.name||''}</div>
        <div class="cell" data-col="Email">${f.email||''}</div>
        <div class="cell" data-col="Skills">${f.skills || ''}</div>
        <div class="cell" data-col="Subscription"><span class="badge">${sub}</span></div>
        <div class="cell" data-col="Profile"><a href="${href}" target="_blank" rel="noopener">View</a></div>
        <div class="cell actions" data-col="Actions"><button class="chip dark" data-uid="${id}">Suspend</button></div>`;
      freelancerRows.appendChild(row);
      const btn = row.querySelector('button[data-uid]');
      btn?.addEventListener('click', ()=> openMod(id));
    }

    function renderClientRow(c){
      const row = document.createElement('div'); row.className='row';
      const id = c.id || c.uid || '';
      row.dataset.search = `${(c.company||'')} ${(c.email||'')}`.toLowerCase();
      row.innerHTML = `
        <div class="cell" data-col="Company Name">${c.company||''}</div>
        <div class="cell" data-col="Email">${c.email||''}</div>
        <div class="cell actions" data-col="Actions"><button class="chip dark" data-uid="${id}">Suspend</button></div>`;
      clientRows.appendChild(row);
      const btn = row.querySelector('button[data-uid]');
      btn?.addEventListener('click', ()=> openMod(id));
    }

    function updateCounts(){
      if (countFreelancers){
        const visible = Array.from(freelancerRows.children).filter(r => r.style.display !== 'none').length;
        countFreelancers.textContent = String(visible);
      }
      if (countClients){
        const visible = Array.from(clientRows.children).filter(r => r.style.display !== 'none').length;
        countClients.textContent = String(visible);
      }
    }

    function applySearch(){
      const q = (topSearch && topSearch.value || '').trim().toLowerCase();
      const showFreelancers = (location.hash === '#freelancers' || location.hash === '' || location.hash == null);
      const container = showFreelancers ? freelancerRows : clientRows;
      Array.from(container.children).forEach(row => {
        const hay = row.dataset.search || row.textContent.toLowerCase();
        row.style.display = q ? (hay.includes(q) ? '' : 'none') : '';
      });
      updateCounts();
    }

    async function loadUsers(){
    try {
      const res = await fetch(`${API_ORIGIN}/api/admin/users-list`, { cache:'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('users_list_failed');
      freelancersData = json.freelancers || [];
      clientsData = json.clients || [];
      freelancersData.forEach(renderFreelancerRow);
      clientsData.forEach(renderClientRow);
    } catch (e) {
      // Fallback demo rows
      freelancersData = [
        { name:'Sarah Johnson', email:'sarah.j@email.com', skills:'React, Node.js, UI/UX', plan:'Premium' },
        { name:'Michael Chen', email:'mchen@email.com', skills:'Python, ML, Data Science', plan:'Premium' }
      ];
      freelancersData.forEach(renderFreelancerRow);
      clientsData = [
        { company:'Tech Corp Ltd', email:'contact@techcorp.com' },
        { company:'StartupXYZ', email:'hello@startupzy.com' }
      ];
      clientsData.forEach(renderClientRow);
    }
    updateCounts();
    }
    loadUsers();

    // Topbar search filters current section
    topSearch?.addEventListener('input', applySearch);
  });
})();
