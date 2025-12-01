(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  if (localStorage.getItem('skiloora_admin_session') !== '1'){ window.location.href = loginUrl; return; }
  document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });

  function setSettingsSection(hash){
    const showRoles = (hash === '#roles' || hash === '' || hash == null);
    document.getElementById('sectionRoles').style.display = showRoles ? 'block' : 'none';
    document.getElementById('sectionPrefs').style.display = showRoles ? 'none' : 'block';
    document.getElementById('navRoles').classList.toggle('active', showRoles);
    document.getElementById('navPrefs').classList.toggle('active', !showRoles);
  }
  window.addEventListener('hashchange', ()=> setSettingsSection(location.hash));
  setSettingsSection(location.hash);
})();
