(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  const hasSession = localStorage.getItem('skiloora_admin_session') === '1';
  if (!hasSession) {
    console.warn('Admin session missing. Showing Issues page for demo.');
    document.addEventListener('DOMContentLoaded', function(){
      const main = document.querySelector('main.admin-main');
      if (main){
        const banner = document.createElement('div');
        banner.style.background = '#fff7d6';
        banner.style.border = '1px solid #f0d26a';
        banner.style.color = '#7a5c00';
        banner.style.padding = '8px 12px';
        banner.style.margin = '12px';
        banner.style.borderRadius = '8px';
        banner.textContent = 'Viewing without admin session. Log in to enable actions.';
        main.prepend(banner);
      }
    });
  }

  const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
  const API_BASE = API_ORIGIN + '/api/admin';

  async function fetchJSON(url, opts){
    try{
      const resp = await fetch(url, opts);
      const data = await resp.json().catch(()=>({}));
      if (!resp.ok) throw new Error(data.error||'request_failed');
      return data;
    }catch(e){ console.error('Fetch failed', url, e); throw e; }
  }

  async function loadMetrics(){
    try {
      const m = await fetchJSON(`${API_BASE}/issues-metrics`);
      const metrics = m.metrics || { open:0, inProgress:0, resolved:0 };
      const mOpen = document.getElementById('irOpen'); if (mOpen) mOpen.textContent = String(metrics.open);
      const mProg = document.getElementById('irInProgress'); if (mProg) mProg.textContent = String(metrics.inProgress);
      const mRes = document.getElementById('irResolved'); if (mRes) mRes.textContent = String(metrics.resolved);
    } catch(e){ console.warn('Metrics load failed, keeping placeholders'); }
  }

  async function loadIssues(){
    const rows = document.getElementById('issueRows');
    if (!rows) return;
    rows.innerHTML = '';
    const countEl = document.getElementById('countIssues');
    function normalizeStatus(s){
      const v = String(s||'').toLowerCase();
      if (v === 'in progress' || v === 'inprogress') return 'in_progress';
      if (v === 'open' || v === 'resolved' || v === 'in_progress') return v;
      // If backend returns a different token, keep it so pill reflects state
      return v || 'open';
    }
    function renderRow(item){
      const el = document.createElement('div'); el.className='row';
      const userLabel = item.displayName || 'User';
      const type = (item.userType||'').charAt(0).toUpperCase() + (item.userType||'').slice(1);
      const priorityRaw = String(item.priority||'').toLowerCase();
      const priority = priorityRaw.toUpperCase();
      const prClass = priorityRaw==='high' ? 'high' : priorityRaw==='medium' ? 'medium' : 'low';
      const stVal = normalizeStatus(item.status);
      // Use one of the known options for the select; fallback to 'open' if unknown
      const selVal = (stVal === 'open' || stVal === 'in_progress' || stVal === 'resolved') ? stVal : 'open';
      const select = `<select class=\"status-select\" data-id='${item.id}'> 
        <option value=\"open\" ${selVal==='open'?'selected':''}>Open</option>
        <option value=\"in_progress\" ${selVal==='in_progress'?'selected':''}>In Progress</option>
        <option value=\"resolved\" ${selVal==='resolved'?'selected':''}>Resolved</option>
      </select>`;
        const statusPill = `<span class=\"status-pill status-${stVal}\">${stVal.replace('_',' ').replace(/\b\w/g, c=>c.toUpperCase())}</span>`;
      el.innerHTML = `
        <div data-col="User">${userLabel}</div>
        <div data-col="User Type"><span class=\"chip\">${type}</span></div>
        <div data-col="Subject" title='${item.description||''}'>${item.subject}</div>
        <div data-col="Priority"><span class=\"chip ${prClass}\">${priority}</span></div>
           <div data-col="Status">${statusPill}${select}</div>
        <div data-col="Actions" style=\"text-align:right\"><button class=\"btn-icon delete-issue\" data-id='${item.id}' title=\"Delete\">🗑️</button></div>`;
      rows.appendChild(el);
    }
    try{
      const data = await fetchJSON(`${API_BASE}/issues-list`);
      const items = data.items||[];
      items.forEach(renderRow);
      if (countEl) countEl.textContent = String(items.length);
      if (!(data.items||[]).length){
        const empty = document.createElement('div'); empty.className='row'; empty.innerHTML = '<div style="grid-column:1 / span 6" class="muted">No issues reported yet.</div>'; rows.appendChild(empty);
      }
    }catch(e){
      console.warn('Issues load failed, falling back to mock');
      const mock = [
        ['Sarah Johnson','Freelancer','Payment not received','High','Open'],
        ['Tech Corp','Freelancer','Unable to post new job','Medium','In Progress'],
        ['Michael Chen','Freelancer','Profile verification delay','Low','Open'],
        ['Design Studio','Freelancer','Search feature not working','High','Open'],
        ['Lisa Anderson','Freelancer','Cannot upload portfolio','Medium','Resolved']
      ];
      const items = mock.map(m=> ({ displayName:m[0], userType:m[1].toLowerCase(), subject:m[2], priority:m[3], status:m[4].toLowerCase(), id:'mock' }));
      items.forEach(renderRow);
      if (countEl) countEl.textContent = String(items.length);
    }
  }

  // Live search binding
  function bindSearch(){
    const input = document.querySelector('.admin-topbar .search');
    if (!input) return;
    input.addEventListener('input', ()=>{
      const term = String(input.value||'').toLowerCase();
      const rows = document.querySelectorAll('#issueRows .row');
      let visible = 0;
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        const show = !term || text.includes(term);
        r.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      const countEl = document.getElementById('countIssues');
      if (countEl) countEl.textContent = String(visible);
    });
  }

  // Internal confirm modal for delete
  let pendingIssue = null;
  function openDeleteModal(subject){
    const m = document.getElementById('confirmIssueModal');
    const s = document.getElementById('ciSubject');
    if (s) s.textContent = subject || '';
    m?.classList.remove('hidden');
  }
  function closeDeleteModal(){
    document.getElementById('confirmIssueModal')?.classList.add('hidden');
    pendingIssue = null;
  }
  function bindDelete(){
    const rows = document.getElementById('issueRows');
    rows?.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button.delete-issue');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id || id === 'mock') return;
      const subject = btn.closest('.row')?.querySelector('[data-col="Subject"]')?.textContent || '';
      pendingIssue = { id };
      openDeleteModal(subject);
    });
    rows?.addEventListener('change', async (e)=>{
      const sel = e.target.closest('select.status-select');
      if (!sel) return;
      const id = sel.getAttribute('data-id');
      const status = sel.value;
      try{
        await fetchJSON(`${API_BASE}/issue-status`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id, status }) });
        // Update metrics and reflect pill immediately without reloading rows
        await loadMetrics();
        const pill = sel.parentElement?.querySelector('.status-pill');
        if (pill){
          // Reset classes and apply the new status class
          pill.className = `status-pill status-${status}`;
          const label = String(status).replace('_',' ');
          pill.textContent = label.replace(/\b\w/g, c=>c.toUpperCase());
        }
      }catch(err){ alert('Failed to update status'); }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });
    loadMetrics();
    loadIssues();
    bindSearch();
    bindDelete();
    // Modal wiring
    document.getElementById('ciClose')?.addEventListener('click', closeDeleteModal);
    document.getElementById('ciCancel')?.addEventListener('click', closeDeleteModal);
    document.getElementById('backdropIssue')?.addEventListener('click', closeDeleteModal);
    document.getElementById('ciConfirm')?.addEventListener('click', async ()=>{
      if (!pendingIssue) return;
      const btn = document.getElementById('ciConfirm');
      const prev = btn?.textContent;
      if (btn){ btn.disabled = true; btn.textContent = 'Deleting…'; }
      try {
        await fetchJSON(`${API_BASE}/issue-delete`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id: pendingIssue.id }) });
        closeDeleteModal();
        await loadMetrics();
        await loadIssues();
      } catch(e){ alert('Failed to delete'); }
      finally { if (btn){ btn.disabled=false; btn.textContent = prev || 'Delete'; } }
    });
  });
})();
