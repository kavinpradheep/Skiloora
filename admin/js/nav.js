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
    const rootBody = document.body;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDom);
  } else {
    initDom();
  }
})();