(() => {
  const path = location.pathname.replace(/\\/g, '/');
  const current = path.split('/').pop();
  // If user navigates with #issues on a different page, redirect to dedicated issues.html
  function redirectIssuesIfNeeded(){
    if (location.hash === '#issues' && current !== 'issues.html') {
      const dir = path.slice(0, path.lastIndexOf('/') + 1);
      window.location.replace(dir + 'issues.html');
      return true;
    }
    return false;
  }
  // If someone hits deprecated #preferences, send to Settings Roles instead
  function redirectPreferencesIfNeeded(){
    if (location.hash === '#preferences'){
      const dir = path.slice(0, path.lastIndexOf('/') + 1);
      window.location.replace(dir + 'settings.html#roles');
      return true;
    }
    return false;
  }
  if (redirectIssuesIfNeeded() || redirectPreferencesIfNeeded()) return;
  window.addEventListener('hashchange', () => { redirectIssuesIfNeeded() || redirectPreferencesIfNeeded(); });

  function initDom(){
    const sidebar = document.querySelector('.admin-sidebar .nav');
    if (!sidebar) return;
    // Ensure body has padding/margin adjusted when sidebar is present
    const rootBody = document.body;
    if (window.matchMedia('(min-width: 1025px)').matches){
      rootBody.classList.remove('menu-open');
    }
    const links = Array.from(sidebar.querySelectorAll('a.nav-sublink, a.nav-item, button.nav-item'));
    links.forEach(el => {
      const href = el.getAttribute('href') || '';
      const target = href.split('/').pop().split('#')[0];
      const isCurrent = target === current;
      if (isCurrent) {
        links.forEach(e => e.classList.remove('active'));
        el.classList.add('active');
      }
      // Also support hash-based sections within same page
      if (!isCurrent && href.includes('#')) {
        const base = href.split('#')[0];
        const baseFile = base.split('/').pop();
        if (baseFile === current && location.hash && href.endsWith(location.hash)) {
          links.forEach(e => e.classList.remove('active'));
          el.classList.add('active');
        }
      }
    });

    // Mobile sidebar toggle
    const menuBtn = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    
    function closeMenu(){
      rootBody.classList.remove('menu-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded','false');
      if (overlay){ overlay.setAttribute('aria-hidden','true'); overlay.setAttribute('hidden',''); }
    }
    function openMenu(){
      rootBody.classList.add('menu-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded','true');
      if (overlay){ overlay.removeAttribute('aria-hidden'); overlay.removeAttribute('hidden'); }
    }
    if (menuBtn){
      menuBtn.addEventListener('click', () => {
        if (rootBody.classList.contains('menu-open')) closeMenu(); else openMenu();
      });
    }
    if (overlay){ overlay.addEventListener('click', closeMenu); }
    links.forEach(el => el.addEventListener('click', closeMenu));

    // Topbar search: suggest page names and navigate
    const search = document.querySelector('.admin-topbar .search');
    if (search){
      const pages = [
        { name:'Dashboard', url:'./dashboard.html' },
        { name:'Freelancers', url:'./users.html#freelancers' },
        { name:'Clients / Hirers', url:'./users.html#clients' },
        { name:'Manage Suspensions', url:'./users-manage.html' },
        { name:'Payments', url:'./payments.html#withdrawals' },
        { name:'Revenue Dashboard', url:'./payments.html#revenue' },
        { name:'Roles & Permissions', url:'./settings.html#roles' },
        { name:'Issue Reports', url:'./issues.html' }
      ];
      const wrap = document.createElement('div');
      wrap.style.position = 'relative';
      const parent = search.parentElement;
      if (parent){ parent.insertBefore(wrap, search); wrap.appendChild(search); }
      const dd = document.createElement('div');
      dd.className = 'search-suggest';
      dd.style.position = 'absolute'; dd.style.top = '110%'; dd.style.left = '0'; dd.style.right = '0';
      dd.style.background = '#fff'; dd.style.border = '1px solid #e5e7eb'; dd.style.borderRadius = '8px'; dd.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
      dd.style.zIndex = '40'; dd.style.padding = '6px'; dd.style.display = 'none';
      wrap.appendChild(dd);

      function render(term){
        const q = String(term||'').toLowerCase();
        const items = pages.filter(p => p.name.toLowerCase().includes(q)).slice(0,6);
        dd.innerHTML = '';
        if (!q || items.length === 0){ dd.style.display = 'none'; return; }
        items.forEach(p => {
          const a = document.createElement('a');
          a.textContent = p.name; a.href = p.url; a.style.display='block'; a.style.padding='6px 8px'; a.style.borderRadius='6px'; a.style.color='#111827';
          a.addEventListener('mouseover', ()=>{ a.style.background='#f3f4f6'; });
          a.addEventListener('mouseout', ()=>{ a.style.background='transparent'; });
          dd.appendChild(a);
        });
        dd.style.display = 'block';
      }

      search.addEventListener('input', ()=> render(search.value));
      search.addEventListener('focus', ()=> render(search.value));
      document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) dd.style.display='none'; });
      search.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter'){
          const first = dd.querySelector('a');
          if (first){ e.preventDefault(); window.location.href = first.getAttribute('href'); dd.style.display='none'; }
        }
      });
    }

    // Avatar dropdown: show Logout option on click
    const avatar = document.querySelector('.admin-topbar .avatar');
    if (avatar){
      const wrap = document.createElement('div');
      wrap.style.position = 'relative';
      const parent = avatar.parentElement;
      if (parent){ parent.insertBefore(wrap, avatar); wrap.appendChild(avatar); }
      const menu = document.createElement('div');
      menu.className = 'avatar-menu';
      menu.style.position = 'absolute'; menu.style.top='110%'; menu.style.right='0';
      menu.style.background='#fff'; menu.style.border='1px solid #e5e7eb'; menu.style.borderRadius='8px';
      menu.style.boxShadow='0 8px 20px rgba(0,0,0,0.08)'; menu.style.zIndex='50'; menu.style.minWidth='160px';
      menu.style.padding='6px'; menu.style.display='none';
      const btn = document.createElement('button');
      btn.textContent = 'Logout'; btn.style.display='block'; btn.style.width='100%'; btn.style.textAlign='left';
      btn.style.padding='8px 10px'; btn.style.border='none'; btn.style.background='transparent'; btn.style.cursor='pointer'; btn.style.borderRadius='6px';
      btn.addEventListener('mouseover', ()=>{ btn.style.background='#f3f4f6'; });
      btn.addEventListener('mouseout', ()=>{ btn.style.background='transparent'; });
      btn.addEventListener('click', ()=>{
        // Reuse sidebar logout behavior
        localStorage.removeItem('skiloora_admin_session');
        const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
        window.location.href = loginUrl;
      });
      menu.appendChild(btn);
      wrap.appendChild(menu);
      function toggle(){ menu.style.display = (menu.style.display==='none' || !menu.style.display) ? 'block' : 'none'; }
      avatar.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });
      document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) menu.style.display='none'; });
      document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') menu.style.display='none'; });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDom);
  } else {
    initDom();
  }
})();