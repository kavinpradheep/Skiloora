(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  if (localStorage.getItem('skiloora_admin_session') !== '1'){ window.location.href = loginUrl; return; }
  document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });

  const suspendedRows = document.getElementById('suspendedRows');
  const bannedRows = document.getElementById('bannedRows');

  // Confirmation modal elements
  const confirmModal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmClose = document.getElementById('confirmClose');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');
  let pendingUid = null;
  let pendingAction = null; // 'unsuspend' | 'unban'

  function openConfirm(action, uid){
    pendingUid = uid; pendingAction = action;
    if (confirmMessage){
      confirmMessage.textContent = action === 'unsuspend' ? 'Are you sure you want to unsuspend this user?' : 'Are you sure you want to unban this user?';
    }
    if (confirmModal) confirmModal.style.display = 'flex';
  }
  function closeConfirm(){ pendingUid = null; pendingAction = null; if (confirmModal) confirmModal.style.display = 'none'; }
  confirmClose?.addEventListener('click', closeConfirm);
  confirmCancel?.addEventListener('click', closeConfirm);

  function fmtDate(v){
    if (!v) return '—';
    try{
      const d = typeof v === 'string' ? new Date(v) : v.toDate ? v.toDate() : new Date(v);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString();
    }catch(_){ return '—'; }
  }

  function renderSuspendedRow(item){
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<div>${item.user.name||''}</div><div>${item.user.email||''}</div><div>${fmtDate(item.until)}</div><div class="muted">${item.reason||''}</div><div class="actions"><button class="chip" data-uid="${item.uid}">Unsuspend</button></div>`;
    const btn = row.querySelector('button[data-uid]');
    btn?.addEventListener('click', ()=> openConfirm('unsuspend', item.uid));
    suspendedRows.appendChild(row);
  }

  function renderBannedRow(item){
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<div>${item.user.name||''}</div><div>${item.user.email||''}</div><div class="muted">${item.reason||''}</div><div class="actions"><button class="chip" data-uid="${item.uid}">Unban</button></div>`;
    const btn = row.querySelector('button[data-uid]');
    btn?.addEventListener('click', ()=> openConfirm('unban', item.uid));
    bannedRows.appendChild(row);
  }

  async function clearModeration(uid){
    try{
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/moderation/clear`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ uid })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'clear_failed');
      await loadList();
      alert('Cleared moderation');
    }catch(e){ alert('Failed to clear moderation'); }
  }

  // Confirm OK handler executes the clear
  confirmOk?.addEventListener('click', async ()=>{
    if (!pendingUid) return;
    await clearModeration(pendingUid);
    closeConfirm();
  });

  async function loadList(){
    suspendedRows.innerHTML = '';
    bannedRows.innerHTML = '';
    try{
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/moderation`, { cache:'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error('list_failed');
      (json.suspended || []).forEach(renderSuspendedRow);
      (json.banned || []).forEach(renderBannedRow);
    }catch(e){
      // No items fallback
      const p1 = document.createElement('p'); p1.className='muted'; p1.textContent = 'No suspended users.'; suspendedRows.appendChild(p1);
      const p2 = document.createElement('p'); p2.className='muted'; p2.textContent = 'No banned users.'; bannedRows.appendChild(p2);
    }
  }

  loadList();
})();
