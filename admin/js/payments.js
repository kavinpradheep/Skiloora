(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  if (localStorage.getItem('skiloora_admin_session') !== '1'){ window.location.href = loginUrl; return; }
  document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });

  function setPaymentsSection(hash){
    const showWithdrawals = (hash === '#withdrawals' || hash === '' || hash == null);
    document.getElementById('sectionWithdrawals').style.display = showWithdrawals ? 'block' : 'none';
    document.getElementById('sectionRevenue').style.display = showWithdrawals ? 'none' : 'block';
    document.getElementById('navWithdrawals').classList.toggle('active', showWithdrawals);
    document.getElementById('navRevenue').classList.toggle('active', !showWithdrawals);
  }
  window.addEventListener('hashchange', ()=> setPaymentsSection(location.hash));
  setPaymentsSection(location.hash);

  const txRows = document.getElementById('txRows');
  const countTx = document.getElementById('countTx');
  const topSearch = document.querySelector('.admin-topbar .search');

  function updateCount(){
    if (!countTx) return;
    const visible = Array.from(txRows.children).filter(r => r.classList && r.classList.contains('row') && r.dataset && r.dataset.search !== undefined && r.style.display !== 'none').length;
    countTx.textContent = String(visible);
  }

  function applySearch(){
    const q = (topSearch && topSearch.value || '').trim().toLowerCase();
    Array.from(txRows.children).forEach(row => {
      if (!row.dataset || row.dataset.search === undefined) return; // skip status rows
      const hay = row.dataset.search || row.textContent.toLowerCase();
      row.style.display = q ? (hay.includes(q) ? '' : 'none') : '';
    });
    updateCount();
  }
  function fmtINR(n){ try{ return new Intl.NumberFormat('en-IN',{ maximumFractionDigits:0 }).format(n); }catch(_){ return String(n); } }
  async function loadPayments(){
    txRows.innerHTML = '';
    try{
      const base = location.origin.replace(/\/$/, '');
      const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
      const res = await fetch(`${backend}/api/admin/payments-list`, { cache: 'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('payments_list_failed');
      const items = json.items || [];
      if (items.length === 0){
        const row = document.createElement('div'); row.className='row';
        row.innerHTML = `<div colspan="6" style="grid-column:1/-1;color:#6b7280">No payments yet.</div>`;
        txRows.appendChild(row); return;
      }
      items.forEach(p => {
        const row = document.createElement('div'); row.className='row';
        const date = p.createdAt ? new Date(p.createdAt) : null;
        const dateStr = date && !isNaN(date) ? date.toISOString().slice(0,10) : '—';
        const name = p.userName || p.userEmail || '—';
        const amountStr = `₹${fmtINR(p.amount || 0)}`;
        const method = p.method || '—';
        const plan = p.plan || '—';
        const acc = p.userEmail || p.accountInfo || '—';
        row.dataset.search = `${plan} ${name} ${amountStr} ${method} ${acc} ${dateStr}`.toLowerCase();
        row.innerHTML = `
          <div class="cell" data-col="Subscription">${plan}</div>
          <div class="cell" data-col="User">${name}</div>
          <div class="cell" data-col="Amount">${amountStr}</div>
          <div class="cell" data-col="Payment Method">${method}</div>
          <div class="cell" data-col="Account info">${acc}</div>
          <div class="cell" data-col="Date">${dateStr}</div>`;
        txRows.appendChild(row);
      });
      updateCount();
    }catch(e){
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `<div colspan="6" style="grid-column:1/-1;color:#ef4444">Failed to load payments</div>`;
      txRows.appendChild(row);
    }
  }
  loadPayments();

  // Wire search
  topSearch?.addEventListener('input', applySearch);

  async function loadRevenue(){
    const base = location.origin.replace(/\/$/, '');
    const backend = base.includes(':5500') ? base.replace(':5500', ':5000') : base;
    const totalEl = document.getElementById('revTotalValue');
    const totalSub = document.getElementById('revTotalSub');
    const growthEl = document.getElementById('revGrowthValue');
    const growthSub = document.getElementById('revGrowthSub');
    const ctx = document.getElementById('revBreakdownChart');
    try{
      const res = await fetch(`${backend}/api/admin/revenue-stats`, { cache:'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('revenue_stats_failed');
      const nf = (n)=>{ try{ return new Intl.NumberFormat('en-IN',{ maximumFractionDigits:0 }).format(n); }catch(_){ return String(n); } };
      const total = json.totalRevenue || 0;
      const growth = json.growthPercent || 0;
      if (totalEl) totalEl.textContent = `₹${nf(total)}`;
      if (totalSub) totalSub.textContent = 'Total paid by freelancers';
      if (growthEl) growthEl.textContent = `${growth>=0?'+':''}${growth.toFixed(1)}%`;
      if (growthSub) growthSub.textContent = 'vs previous month';

      if (ctx && window.Chart){
        const labels = (json.series && json.series.labels) || [];
        const values = (json.series && json.series.values) || [];
        new Chart(ctx, { type:'line',
          data:{ labels, datasets:[{ label:'Revenue', data: values, borderColor:'#111827', backgroundColor:'transparent', tension:.3 }]},
          options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
        });
      }
    }catch(e){
      if (totalEl) totalEl.textContent = '—';
      if (growthEl) growthEl.textContent = '—';
    }
  }
  loadRevenue();
})();
