(() => {
  const path = location.pathname.replace(/\\/g, '/');
  const current = path.split('/').pop();
  const sidebar = document.querySelector('.admin-sidebar .nav');
  if (!sidebar) return;
  const links = Array.from(sidebar.querySelectorAll('a.nav-sublink, button.nav-item'));
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
})();