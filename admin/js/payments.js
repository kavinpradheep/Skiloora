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

  const txs = [
    { sub:'Standard', user:'Sarah Johnson', amt:'2,999', method:'Bank Transfer', acc:'****4533', date:'2024-08-19' },
    { sub:'Premium', user:'Michael Chen', amt:'3,999', method:'PayPal', acc:'mchen@email.com', date:'2024-08-19' },
    { sub:'Premium', user:'David Kim', amt:'3,999', method:'Bank Transfer', acc:'****7892', date:'2024-08-19' },
    { sub:'Standard', user:'Lisa Anderson', amt:'2,999', method:'PayPal', acc:'lisa@email.com', date:'2024-08-18' },
  ];
  const txRows = document.getElementById('txRows');
  txs.forEach(t=>{
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<div>${t.sub}</div><div>${t.user}</div><div>₹${t.amt}</div><div>${t.method}</div><div>${t.acc}</div><div>${t.date}</div>`;
    txRows.appendChild(row);
  });

  const ctx = document.getElementById('revBreakdownChart');
  if (ctx && window.Chart){
    new Chart(ctx, { type:'line',
      data:{ labels:['Jan','Feb','Mar','Apr','May','Jun'], datasets:[{ label:'Revenue', data:[12000,18000,25000,32000,41000,60000], borderColor:'#111827', backgroundColor:'transparent', tension:.3 }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
    });
  }
})();
