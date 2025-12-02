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

  const API_BASE = 'http://localhost:5000/api/admin';

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
    function normalizeStatus(s){
      const v = String(s||'').toLowerCase();
      if (v === 'in progress' || v === 'inprogress') return 'in_progress';
      if (v === 'resolved') return 'resolved';
      return 'open';
    }
    function renderRow(item){
      const el = document.createElement('div'); el.className='row';
      const userLabel = item.displayName || 'User';
      const type = (item.userType||'').charAt(0).toUpperCase() + (item.userType||'').slice(1);
      const priority = String(item.priority||'').toUpperCase();
      const stVal = normalizeStatus(item.status);
      const select = `<select class=\"status-select\" data-id='${item.id}'>
        <option value=\"open\" ${stVal==='open'?'selected':''}>Open</option>
        <option value=\"in_progress\" ${stVal==='in_progress'?'selected':''}>In Progress</option>
        <option value=\"resolved\" ${stVal==='resolved'?'selected':''}>Resolved</option>
      </select>`;
      el.innerHTML = `<div>${userLabel}</div><div><span class=\"chip\">${type}</span></div><div title='${item.description||''}'>${item.subject}</div><div><span class=\"chip\">${priority}</span></div><div>${select}</div><div style=\"text-align:right\"><button class=\"btn-icon delete-issue\" data-id='${item.id}' title=\"Delete\">🗑️</button></div>`;
      rows.appendChild(el);
    }
    try{
      const data = await fetchJSON(`${API_BASE}/issues-list`);
      (data.items||[]).forEach(renderRow);
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
      mock.forEach(m=> renderRow({ displayName:m[0], userType:m[1].toLowerCase(), subject:m[2], priority:m[3], status:m[4].toLowerCase(), id:'mock' }));
    }
  }

  function bindDelete(){
    const rows = document.getElementById('issueRows');
    rows?.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button.delete-issue');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id || id === 'mock') return;
      if (!confirm('Delete this issue?')) return;
      try {
        await fetchJSON(`${API_BASE}/issue-delete`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id }) });
        await loadMetrics();
        await loadIssues();
      } catch(e){ alert('Failed to delete'); }
    });
    rows?.addEventListener('change', async (e)=>{
      const sel = e.target.closest('select.status-select');
      if (!sel) return;
      const id = sel.getAttribute('data-id');
      const status = sel.value;
      try{
        await fetchJSON(`${API_BASE}/issue-status`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id, status }) });
        await loadMetrics();
      }catch(err){ alert('Failed to update status'); }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });
    loadMetrics();
    loadIssues();
    bindDelete();
  });
})();
