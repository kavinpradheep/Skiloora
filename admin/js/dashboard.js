(function(){
  const loginUrl = `${location.origin.replace(/\/$/, '')}/freelancer/html/login.html`;
  if (localStorage.getItem('skiloora_admin_session') !== '1'){ window.location.href = loginUrl; return; }
  document.getElementById('adminLogout')?.addEventListener('click', ()=>{ localStorage.removeItem('skiloora_admin_session'); window.location.href = loginUrl; });

  const line = (id,label,data)=> new Chart(document.getElementById(id), { type:'line', data:{ labels:['Jan','Feb','Mar','Apr','May','Jun'], datasets:[{ label, data, borderColor:'#111827', backgroundColor:'transparent', tension:.3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } } });

  async function loadRealData(){
    try {
      const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
      const res = await fetch(`${API_ORIGIN}/api/admin/metrics`, { cache:'no-store' });
      const json = await res.json();
      if (!json || !json.ok) throw new Error('metrics_failed');
      const totals = json.totals || { users: 0, activeFreelancers: 0, totalRevenue: 0 };
      const lastMonth = json.lastMonth || { users: 0, activeFreelancers: 0, totalRevenue: 0 };
      const pct = (a,b)=> ((a-b)/Math.max(1,b))*100;
      mTotalUsers.textContent = Number(totals.users || 0).toLocaleString();
      mActiveFree.textContent = Number(totals.activeFreelancers || 0).toLocaleString();
      mRevenue.textContent = `${(Number(totals.totalRevenue || 0)/1000).toFixed(1)}K`;
      mTotalUsersSub.textContent = `${pct(totals.users,lastMonth.users).toFixed(1)}% vs last month`;
      mActiveFreeSub.textContent = `${pct(totals.activeFreelancers,lastMonth.activeFreelancers).toFixed(1)}% vs last month`;
      mRevenueSub.textContent = `${pct(totals.totalRevenue,lastMonth.totalRevenue).toFixed(1)}% vs last month`;
      const revSeries = (json.series && json.series.revenue) || [15000,22000,28000,35000,42000,60000];
      const userSeries = (json.series && json.series.users) || [600,900,1200,1600,2100, Number(totals.users || 0)];
      line('revenueChart', 'Revenue', revSeries);
      line('userChart', 'Users', userSeries);
    } catch (e) {
      const totals = { users: 2650, activeFree: 1432, revenueUSD: 175500 };
      const lastMonth = { users: 2355, activeFree: 1407, revenueUSD: 144000 };
      const pct = (a,b)=> ((a-b)/Math.max(1,b))*100;
      mTotalUsers.textContent = totals.users.toLocaleString();
      mActiveFree.textContent = totals.activeFree.toLocaleString();
      mRevenue.textContent = `${(totals.revenueUSD/1000).toFixed(1)}K`;
      mTotalUsersSub.textContent = `${pct(totals.users,lastMonth.users).toFixed(1)}% vs last month`;
      mActiveFreeSub.textContent = `${pct(totals.activeFree,lastMonth.activeFree).toFixed(1)}% vs last month`;
      mRevenueSub.textContent = `${pct(totals.revenueUSD,lastMonth.revenueUSD).toFixed(1)}% vs last month`;
      line('revenueChart', 'Revenue', [15000, 22000, 28000, 35000, 42000, 60000]);
      line('userChart', 'Users', [600, 900, 1200, 1600, 2100, 2650]);
    }
  }
  loadRealData();
})();
