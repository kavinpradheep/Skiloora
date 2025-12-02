// Dashboard logic for Skiloora (Firebase compat SDK)
const auth = window.firebaseAuth;
const db = window.firebaseDB;
const storage = window.firebaseStorage;

const navButtons = document.querySelectorAll('.nav-item');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeTitle = document.getElementById('welcomeTitle');
const topUserAvatar = document.getElementById('userAvatar');
const topUserName = document.getElementById('userName');
const topUserRole = document.getElementById('userRole');
const userMenuRoot = document.getElementById('userMenuRoot');
const userMenuToggle = document.getElementById('userMenuToggle');
const userMenu = document.getElementById('userMenu');
const menuLogout = document.getElementById('menuLogout');

const metricRevenue = document.getElementById('metricRevenue');
const metricToday = document.getElementById('metricToday');
const metricMonthly = document.getElementById('metricMonthly');
const metricGrowth = document.getElementById('metricGrowth');

const ordersNew = document.getElementById('ordersNew');
const ordersActive = document.getElementById('ordersActive');
const ordersPending = document.getElementById('ordersPending');
const ordersDelivered = document.getElementById('ordersDelivered');
const ordersCancelled = document.getElementById('ordersCancelled');

const btnAddProject = document.getElementById('btnAddProject');
const projectsGrid = document.getElementById('projectsGrid');
const projectLinks = document.getElementById('projectLinks');
const searchInput = document.getElementById('globalSearch');
const searchSuggest = document.getElementById('searchSuggest');
let projectsCache = [];

const editProfileBtn = document.getElementById('editProfile');
const viewPublicBtn = document.getElementById('viewPublic');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');
const profileTagline = document.getElementById('profileTagline');
const infoEmail = document.getElementById('infoEmail');
const infoPhone = document.getElementById('infoPhone');
const infoLocation = document.getElementById('infoLocation');
const infoRate = document.getElementById('infoRate');
const infoProjects = document.getElementById('infoProjects');
const infoResponse = document.getElementById('infoResponse');
const infoLang = document.getElementById('infoLang');
const infoCerts = document.getElementById('infoCerts');
const infoSkills = document.getElementById('infoSkills');
const infoEducation = document.getElementById('infoEducation');
const infoBio = document.getElementById('infoBio');
const infoSocial = document.getElementById('infoSocial');
const addCertsBtn = document.getElementById('addCertsBtn');

const modalAdd = document.getElementById('modalAdd');
const cancelAdd = document.getElementById('cancelAdd');
const saveAdd = document.getElementById('saveAdd');
const projTitle = document.getElementById('projTitle');
const projLink = document.getElementById('projLink');
const projImageFile = document.getElementById('projImageFile');
const projImageUrl = document.getElementById('projImageUrl');
// Description removed

// Navigation: smooth scroll instead of show/hide sections
navButtons.forEach(btn => {
  // Nav button click: Scroll smoothly to target section and set active state.
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Ensure all sections visible when using scroll navigation
    document.querySelectorAll('.content > .section, .content > .hero').forEach(sec => { sec.style.display = ''; });
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = './login.html';
  } catch (e) {
    alert('Failed to logout.');
  }
});
menuLogout?.addEventListener('click', async () => {
  try { await auth.signOut(); window.location.href = './login.html'; } catch(e){}
});
userMenuToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !userMenu.classList.contains('hidden');
  userMenu.classList.toggle('hidden', isOpen);
  userMenuToggle.setAttribute('aria-expanded', String(!isOpen));
});
document.addEventListener('click', (e) => {
  if (!userMenuRoot?.contains(e.target)) {
    userMenu?.classList.add('hidden');
    userMenuToggle?.setAttribute('aria-expanded', 'false');
  }
});

editProfileBtn?.addEventListener('click', () => {
  window.location.href = './edit-profile.html';
});
viewPublicBtn?.addEventListener('click', () => {
  const uid = auth.currentUser?.uid || '';
  const url = uid ? `./public-profile.html?uid=${encodeURIComponent(uid)}` : './public-profile.html';
  window.location.href = url;
});
addCertsBtn?.addEventListener('click', () => {
  window.location.href = './edit-profile.html#certifications';
});

btnAddProject?.addEventListener('click', () => modalAdd.classList.remove('hidden'));
cancelAdd?.addEventListener('click', () => modalAdd.classList.add('hidden'));

function setText(el, val) { if (el) el.textContent = val ?? '—'; }
// setChipRow(el, arr): Render simple chip elements for each array item.
function setChipRow(el, arr) {
  if (!el) return;
  el.innerHTML = '';
  (arr || []).forEach(t => {
    const c = document.createElement('div');
    c.className = 'chip';
    c.textContent = t;
    el.appendChild(c);
  });
}

// setCertList(el, arr): Render certification items as list blocks.
function setCertList(el, arr) {
  if (!el) return;
  el.innerHTML = '';
  (arr || []).forEach(t => {
    const row = document.createElement('div');
    row.className = 'cert-item';
    const txt = document.createElement('span');
    txt.textContent = t;
    row.appendChild(txt);
    el.appendChild(row);
  });
}

// renderProjects(uid): Load project docs, build cards & link chips, enable deletion.
function renderProjects(uid) {
  if (!projectsGrid || !projectLinks) return;
  projectsGrid.innerHTML = '';
  projectLinks.innerHTML = '';
  projectsCache = [];
  db.collection('users').doc(uid).collection('projects').orderBy('createdAt', 'desc').get()
    .then(snap => {
      const count = snap.size;
      setText(infoProjects, String(count));
      snap.forEach(doc => {
        const p = doc.data();
        projectsCache.push({ id: doc.id, title: p.title || 'Untitled', link: p.link || '', imageUrl: p.imageUrl || '' });
        const card = document.createElement('div');
        card.className = 'project-card';
        const img = document.createElement('img');
        img.src = p.imageUrl || 'https://via.placeholder.com/600x300?text=No+Image';
        const body = document.createElement('div');
        body.className = 'proj-body';
        const title = document.createElement('div');
        title.textContent = p.title || 'Untitled';
        const linkBtn = document.createElement('a');
        linkBtn.href = p.link || '#';
        linkBtn.target = '_blank';
        linkBtn.className = 'btn-ghost';
        linkBtn.textContent = 'Open';
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️';
        delBtn.title = 'Delete Project';
        delBtn.className = 'chip-delete-btn';
        delBtn.addEventListener('click', async () => {
          if (!confirm('Delete this project?')) return;
          try {
            await db.collection('users').doc(uid).collection('projects').doc(doc.id).delete();
            renderProjects(uid);
          } catch (e) { alert('Failed to delete project'); }
        });
        body.appendChild(title);
        const actionsWrap = document.createElement('div');
        actionsWrap.style.display = 'flex';
        actionsWrap.style.gap = '6px';
        actionsWrap.appendChild(linkBtn);
        actionsWrap.appendChild(delBtn);
        body.appendChild(actionsWrap);
        card.appendChild(img);
        card.appendChild(body);
        projectsGrid.appendChild(card);

        if (p.link) {
          const linkChip = document.createElement('a');
          linkChip.href = p.link;
          linkChip.target = '_blank';
          linkChip.className = 'chip';
          linkChip.textContent = p.title || p.link;
          const chipWrapper = document.createElement('div');
          chipWrapper.style.display = 'flex';
          chipWrapper.style.alignItems = 'center';
          chipWrapper.style.gap = '4px';
          chipWrapper.appendChild(linkChip);
          const chipDel = document.createElement('button');
          chipDel.textContent = '🗑️';
          chipDel.title = 'Delete Project';
          chipDel.className = 'chip-delete-btn';
          chipDel.addEventListener('click', async () => {
            if (!confirm('Delete this project?')) return;
            try {
              await db.collection('users').doc(uid).collection('projects').doc(doc.id).delete();
              renderProjects(uid);
            } catch (e) { alert('Failed to delete project'); }
          });
          chipWrapper.appendChild(chipDel);
          projectLinks.appendChild(chipWrapper);
        }
      });
    })
    .catch(err => console.error('Render projects failed', err));
}

// renderProfile(user, profile): Populate dashboard profile sections and top bar with user data.
function renderProfile(user, profile) {
  const displayName = profile?.name || user.displayName || 'User';
  setText(welcomeTitle, `Welcome back, ${displayName}!`);
  setText(profileName, displayName);
  setText(profileRole, profile?.title || profile?.roleLong || 'Developer');
  if (profileTagline) {
    const tagline = (profile?.roleLong || '').trim();
    if (tagline) {
      profileTagline.textContent = tagline;
      profileTagline.style.display = '';
    } else {
      profileTagline.style.display = 'none';
    }
  }
  if (profileAvatar) {
    if (profile?.avatarUrl) {
      profileAvatar.src = profile.avatarUrl;
      profileAvatar.alt = displayName;
    } else {
      // Generate letter avatar SVG data URI
      const letter = displayName.charAt(0).toUpperCase();
      const bg = '#111827';
      const fg = '#ffffff';
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>`+
        `<rect width='96' height='96' rx='12' fill='${bg}'/>`+
        `<text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='50' font-family='Arial,Helvetica,sans-serif' fill='${fg}'>${letter}</text>`+
        `</svg>`;
      profileAvatar.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      profileAvatar.alt = letter;
    }
  }

  setText(infoEmail, user.email || profile?.email);
  setText(infoPhone, profile?.phone || '+1 (555) 123-4567');
  setText(infoLocation, profile?.location || 'San Francisco, CA');
  setText(infoRate, profile?.hourlyRate ? `₹${profile.hourlyRate}/hr` : '₹85/hr');
  setText(infoResponse, profile?.responseTime || '1 hour');
  setText(infoBio, profile?.bio || '—');
  setChipRow(infoLang, profile?.languages || []);
  setCertList(infoCerts, profile?.certifications || []);
  setChipRow(infoSkills, profile?.skills || []);
  setText(infoEducation, profile?.education || 'Bachelor of Computer Science, Stanford University');
  if (infoSocial) {
    infoSocial.innerHTML = '';
    const socials = profile?.socials || {};
    const ordered = ['github','dribbble','linkedin','x'];
    ordered.forEach(key => {
      const url = socials[key];
      if (url) {
        const a = document.createElement('a');
        a.href = url.startsWith('http') ? url : 'https://' + url;
        a.target = '_blank';
        a.title = key;
        a.textContent = key[0].toUpperCase();
        infoSocial.appendChild(a);
      }
    });
  }
  // Topbar user info
  if (topUserName) topUserName.textContent = displayName;
  if (topUserRole) topUserRole.textContent = profile?.title || profile?.roleLong || 'Developer';
  if (topUserAvatar) {
    if (profile?.avatarUrl) {
      topUserAvatar.src = profile.avatarUrl;
      topUserAvatar.alt = displayName;
    } else {
      const letter = displayName.charAt(0).toUpperCase();
      const bg = '#111827';
      const fg = '#ffffff';
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><rect width='96' height='96' rx='12' fill='${bg}'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='central' font-size='50' font-family='Arial,Helvetica,sans-serif' fill='${fg}'>${letter}</text></svg>`;
      topUserAvatar.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      topUserAvatar.alt = letter;
    }
  }
  // Also render social icons in card
  const cardSocial = document.getElementById('cardSocial');
  if (cardSocial) {
    cardSocial.innerHTML = '';
    const socials = profile?.socials || {};
    const ordered = ['github','dribbble','linkedin','x'];
    ordered.forEach(key => {
      const url = socials[key];
      if (url) {
        const a = document.createElement('a');
        a.href = url.startsWith('http') ? url : 'https://' + url;
        a.target = '_blank';
        a.title = key;
        a.textContent = key[0].toUpperCase();
        cardSocial.appendChild(a);
      }
    });
  }
}

// renderMetrics(uid): Aggregate mock metrics, order status counts, and build revenue line chart.
function renderMetrics(uid) {
  db.collection('users').doc(uid).collection('orders').get().then(snap => {
    const total = snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
    setText(metricRevenue, `₹${total}`);
    setText(metricToday, `₹${Math.round(total * 0.02)}`);
    setText(metricMonthly, `₹${Math.round(total * 0.4)}`);
    setText(metricGrowth, `${Math.round(Math.random()*20)}%`);

    const statusCounts = { new:0, active:0, pending:0, delivered:0, cancelled:0 };
    snap.forEach(d => { const s = (d.data().status || '').toLowerCase(); if (statusCounts[s] !== undefined) statusCounts[s]++; });
    setText(ordersNew, String(statusCounts.new));
    setText(ordersActive, String(statusCounts.active));
    setText(ordersPending, String(statusCounts.pending));
    setText(ordersDelivered, String(statusCounts.delivered));
    setText(ordersCancelled, String(statusCounts.cancelled));

    const ctx = document.getElementById('lineChart');
    if (ctx && window.Chart) {
      const vals = Array.from({length: 12}, () => Math.max(0, Math.round(total/12 + (Math.random()-0.5)* (total/20))));
      new Chart(ctx, {
        type: 'line',
        data: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], datasets: [{ label:'Revenue', data: vals, borderColor:'#111827', fill:false }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  });
}

saveAdd?.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Please login again before uploading.');
    return;
  }
  console.log('Uploading as uid:', user.uid);
  const title = (projTitle.value || '').trim();
  const link = (projLink.value || '').trim();
  // Description removed
  const file = projImageFile.files?.[0];
  const imageUrlInput = (projImageUrl?.value || '').trim();
  if (!title) return alert('Project title is required');
  // Image is optional: prefer provided URL; if none, use upload; if neither, use placeholder.
  try {
    const projDocRef = db.collection('users').doc(user.uid).collection('projects').doc();
    let imageUrl = imageUrlInput;
    if (!imageUrl && file) {
      const storageRef = storage.ref().child(`users/${user.uid}/projects/${projDocRef.id}/${file.name}`);
      await storageRef.put(file);
      imageUrl = await storageRef.getDownloadURL();
    }
    if (!imageUrl) {
      imageUrl = 'https://via.placeholder.com/600x300?text=Project+Image';
    }
    await projDocRef.set({ title, link, imageUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    modalAdd.classList.add('hidden');
    projTitle.value = ''; projLink.value = ''; if (projImageFile) projImageFile.value = ''; if (projImageUrl) projImageUrl.value = '';
    renderProjects(user.uid);
  } catch (e) {
    console.error('Add project failed', e);
    alert('Failed to add project. If using uploads, ensure rules allow authenticated writes.');
  }
});

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = './login.html'; return; }
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    const profile = userDoc.exists ? userDoc.data() : { email: user.email };
    renderProfile(user, profile);
    renderMetrics(user.uid);
    renderProjects(user.uid);
  } catch (e) {}
});

// renderSuggestions(results): Show project search dropdown suggestions; navigate/open on click.
function renderSuggestions(results) {
  if (!searchSuggest) return;
  if (!results.length) { searchSuggest.innerHTML = '<div class="item"><span class="sub">No projects found</span></div>'; searchSuggest.classList.remove('hidden'); return; }
  searchSuggest.innerHTML = '';
  results.forEach(p => {
    const row = document.createElement('div');
    row.className = 'item';
    const icon = document.createElement('span'); icon.textContent = '📁';
    const textWrap = document.createElement('div');
    const title = document.createElement('div'); title.className = 'title'; title.textContent = p.title;
    const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = p.link || 'No link';
    textWrap.appendChild(title); textWrap.appendChild(sub);
    row.appendChild(icon); row.appendChild(textWrap);
    row.addEventListener('click', () => {
      searchSuggest.classList.add('hidden');
      if (p.link) { window.open(p.link, '_blank'); }
      else { document.getElementById('projects')?.scrollIntoView({behavior:'smooth'}); }
    });
    searchSuggest.appendChild(row);
  });
  searchSuggest.classList.remove('hidden');
}

searchInput?.addEventListener('input', () => {
  const q = (searchInput.value || '').trim().toLowerCase();
  if (!q) { searchSuggest?.classList.add('hidden'); return; }
  const matches = projectsCache.filter(p => p.title.toLowerCase().includes(q) || (p.link||'').toLowerCase().includes(q)).slice(0,8);
  renderSuggestions(matches);
});
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = (searchInput.value || '').trim().toLowerCase();
    const first = projectsCache.find(p => p.title.toLowerCase().includes(q) || (p.link||'').toLowerCase().includes(q));
    if (first) {
      e.preventDefault();
      searchSuggest?.classList.add('hidden');
      if (first.link) window.open(first.link, '_blank'); else document.getElementById('projects')?.scrollIntoView({behavior:'smooth'});
    }
  } else if (e.key === 'Escape') {
    searchSuggest?.classList.add('hidden');
  }
});
document.addEventListener('click', (e) => {
  if (!searchSuggest?.contains(e.target) && e.target !== searchInput) {
    searchSuggest?.classList.add('hidden');
  }
});

// ---------------- Issue Reporting (Freelancer Dashboard) ----------------
const fdIssueSubject = document.getElementById('fdIssueSubject');
const fdIssuePriority = document.getElementById('fdIssuePriority');
const fdIssueDesc = document.getElementById('fdIssueDesc');
const fdIssueSubmit = document.getElementById('fdIssueSubmit');
const fdIssueMsg = document.getElementById('fdIssueMsg');

fdIssueSubmit?.addEventListener('click', async () => {
  try {
    const user = auth.currentUser;
    if (!user) { alert('Please login first'); return; }
    const subject = (fdIssueSubject?.value || '').trim();
    const priority = (fdIssuePriority?.value || 'low').trim();
    const description = (fdIssueDesc?.value || '').trim();
    if (!subject || !description){ fdIssueMsg.textContent='Subject and description required.'; return; }
    fdIssueMsg.textContent='Submitting...';
    const idToken = await user.getIdToken(true);
    const resp = await fetch('http://localhost:5000/api/issues/report', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+idToken },
      body: JSON.stringify({ subject, priority, description })
    });
    const json = await resp.json().catch(()=>({}));
    if (!resp.ok || !json.ok) throw new Error(json.error||'submit_failed');
    fdIssueSubject.value=''; fdIssueDesc.value=''; fdIssuePriority.value='low';
    fdIssueMsg.textContent='Issue reported successfully.';
    setTimeout(()=>{ if(fdIssueMsg) fdIssueMsg.textContent=''; }, 3500);
  } catch(e){ console.error('Issue report failed', e); fdIssueMsg.textContent='Failed to submit issue.'; }
});
