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
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnPrint = document.getElementById('btnPrint');

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
  const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
  async function loadPayments(){
    txRows.innerHTML = '';
    window.__paymentsCache = [];
    try{
      const res = await fetch(`${API_ORIGIN}/api/admin/payments-list`, { cache: 'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('payments_list_failed');
      const items = json.items || [];
      window.__paymentsCache = items;
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
    const totalEl = document.getElementById('revTotalValue');
    const totalSub = document.getElementById('revTotalSub');
    const growthEl = document.getElementById('revGrowthValue');
    const growthSub = document.getElementById('revGrowthSub');
    const ctx = document.getElementById('revBreakdownChart');
    try{
      const res = await fetch(`${API_ORIGIN}/api/admin/revenue-stats`, { cache:'no-store' });
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

  // Export CSV (uses current filtered visible rows to honor search)
  function exportCsv(){
    const headers = ['Subscription','User','Amount','Payment Method','Account info','Date'];
    const rows = Array.from(document.querySelectorAll('#txRows .row'));
    const data = [];
    rows.forEach(r => {
      if (r.style.display === 'none') return;
      const cells = r.querySelectorAll('.cell');
      if (cells.length < 6) return;
      const row = [];
      cells.forEach((c, idx) => {
        const t = c.textContent.trim();
        if (idx === 2){
          // Amount: output as a pure number so Excel parses correctly
          const num = t.replace(/[^0-9.]/g, '');
          row.push(num);
        } else {
          const s = t.replace(/\"/g,'\"\"');
          row.push(`\"${s}\"`);
        }
      });
      data.push(row.join(','));
    });
    // Prepend UTF-8 BOM so Excel renders unicode (₹) correctly
    const csv = ['\uFEFF' + headers.join(','), ...data].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    a.download = `payments-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Print statement (opens native print of the current list section)
  function printStatement(){
    const section = document.getElementById('sectionWithdrawals');
    if (!section) { window.print(); return; }
    const w = window.open('', '_blank');
    if (!w) { window.print(); return; }
    const cssLinks = [
      '../css/admin.css',
      '../css/payments.css'
    ];
    const head = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${cssLinks.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}</head><body>`;
    const title = '<h2>Membership Payments Statement</h2>';
    const html = section.querySelector('.table')?.outerHTML || section.innerHTML;
    w.document.open();
    w.document.write(head + title + html + '</body></html>');
    w.document.close();
    w.addEventListener('load', ()=>{ w.focus(); w.print(); setTimeout(()=>{ try{ w.close(); }catch(_){ } }, 200); });
  }

  btnExportCsv?.addEventListener('click', exportCsv);
  btnPrint?.addEventListener('click', printStatement);
})();
