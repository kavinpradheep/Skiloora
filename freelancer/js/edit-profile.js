const auth = window.firebaseAuth;
const db = window.firebaseDB;
const storage = window.firebaseStorage;

const cancelEdit = document.getElementById('cancelEdit');
const saveBtn = document.getElementById('saveProfile');

const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editPhone = document.getElementById('editPhone');
const editLocation = document.getElementById('editLocation');
const editRate = document.getElementById('editRate');
const editPrimaryRole = document.getElementById('editPrimaryRole');
const editAvatarFile = document.getElementById('editAvatarFile');
const editBio = document.getElementById('editBio');
const editGithub = document.getElementById('editGithub');
const editDribbble = document.getElementById('editDribbble');
const editLinkedin = document.getElementById('editLinkedin');
const editX = document.getElementById('editX');
const editContactLink = document.getElementById('contactLink');

// Chip editors
const editLangList = document.getElementById('editLangList');
const editLangInput = document.getElementById('editLangInput');
const addLangBtn = document.getElementById('addLangBtn');
const editSkillsList = document.getElementById('editSkillsList');
const editSkillsInput = document.getElementById('editSkillsInput');
const addSkillBtn = document.getElementById('addSkillBtn');
const editCertsList = document.getElementById('editCertsList');
const editCertsInput = document.getElementById('editCertsInput');
const addCertBtn = document.getElementById('addCertBtn');

let langs = [];
let skills = [];
let certs = [];
const editEducation = document.getElementById('editEducation');

cancelEdit.addEventListener('click', () => { window.location.href = './dashboard.html'; });

// csvToArray(val): Split comma-separated string into trimmed non-empty array.
function csvToArray(val) { return (val || '').split(',').map(s => s.trim()).filter(Boolean); }

// renderChips(container, items, stacked): Render removable chips (or stacked list) for items.
function renderChips(container, items, stacked=false) {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((t, idx) => {
    if (stacked) {
      const row = document.createElement('div');
      row.className = 'stack-item';
      const span = document.createElement('span');
      span.textContent = t;
      const rm = document.createElement('button');
      rm.className = 'rm';
      rm.textContent = '×';
      rm.addEventListener('click', () => { items.splice(idx,1); renderChips(container, items, stacked); });
      row.appendChild(span); row.appendChild(rm);
      container.appendChild(row);
    } else {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = t;
      const rm = document.createElement('button');
      rm.className = 'rm';
      rm.textContent = '×';
      rm.addEventListener('click', () => { items.splice(idx,1); renderChips(container, items, stacked); });
      chip.appendChild(rm);
      container.appendChild(chip);
    }
  });
}

auth.onAuthStateChanged(async (user) => {
  // Auth listener: Load user profile; enforce role guard
  if (!user) { window.location.href = './login.html'; return; }
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    const p = doc.exists ? doc.data() : { email: user.email, name: user.displayName };
    const role = String(p.role||'').toLowerCase().trim();
    if (role === 'admin') { window.location.href='../../admin/html/dashboard.html'; return; }
    if (role === 'buyer' || role === 'hirer') { window.location.href='../../buyer/html/index.html'; return; }

    // If no role present, fall back to backend admin flag
    if (!role) {
      try {
        const idToken = await user.getIdToken(true);
        const API_ORIGIN = (location.hostname==='localhost'||location.hostname==='127.0.0.1') ? 'http://localhost:5000' : 'https://skiloora.onrender.com';
        const resp = await fetch(API_ORIGIN + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({})
        });
        const json = await resp.json().catch(()=>({}));
        if (resp.ok && json.isAdmin) {
          try { localStorage.setItem('skiloora_admin_session', '1'); } catch(_){ }
          window.location.href = '../../admin/html/dashboard.html';
          return;
        }
      } catch(_) { /* ignore */ }
    }
    editName.value = p.name || '';
    editEmail.value = user.email || '';
    editPhone.value = p.phone || '';
    editLocation.value = p.location || '';
    editRate.value = p.hourlyRate || '';
    // keep account role (buyer/freelancer) untouched; use title as the selected professional role
    if (editPrimaryRole) editPrimaryRole.value = (p.title || p.roleLong || '').trim();
    editBio.value = p.bio || '';
    editEducation.value = p.education || '';
    const s = p.socials || {};
    editGithub.value = s.github || '';
    editDribbble.value = s.dribbble || '';
    editLinkedin.value = s.linkedin || '';
    editX.value = s.x || '';
    if (editContactLink) editContactLink.value = p.contactLink || '';

    langs = [...(p.languages || [])];
    skills = [...(p.skills || [])];
    certs = [...(p.certifications || [])];
    renderChips(editLangList, langs);
    renderChips(editSkillsList, skills);
    renderChips(editCertsList, certs, true);

  } catch (e) { console.error('Load profile failed', e); }
});

function gatherAndSave() { return (async () => {
  // gatherAndSave(): Collect form data, upload avatar (if any), merge updates into user doc, then redirect.
  const user = auth.currentUser;
  if (!user) return alert('Please login again');
  try {
    let avatarUrl;
    const file = editAvatarFile.files?.[0];
    if (file) {
      const ref = storage.ref().child(`users/${user.uid}/avatar/${file.name}`);
      await ref.put(file);
      avatarUrl = await ref.getDownloadURL();
    }
    const payload = {
      name: editName.value.trim(),
      email: user.email,
      phone: editPhone.value.trim(),
      location: editLocation.value.trim(),
      // do not overwrite account role; store selected role as title
      title: (editPrimaryRole?.value || '').trim(),
      bio: editBio.value.trim(),
      languages: langs,
      certifications: certs,
      skills: skills,
      education: editEducation.value.trim(),
    };
    const rateVal = Number(editRate.value);
    if (editRate.value !== '' && Number.isFinite(rateVal)) payload.hourlyRate = rateVal;
    const socials = {};
    [["github", editGithub.value],["dribbble", editDribbble.value],["linkedin", editLinkedin.value],["x", editX.value]].forEach(([k,v])=>{ v=v.trim(); if(v) socials[k]=v; });
    if(Object.keys(socials).length) payload.socials = socials;
    const cl = (editContactLink?.value || '').trim();
    if (cl) payload.contactLink = cl;
    if (avatarUrl) payload.avatarUrl = avatarUrl;
    await db.collection('users').doc(user.uid).set(payload, { merge: true });
    window.location.href = './dashboard.html';
  } catch (e) { console.error('Save profile failed', e); alert('Failed to save profile'); }
})(); }

saveBtn.addEventListener('click', gatherAndSave);

// Chip add handlers
// addIfAny(val,list,render): Add trimmed value to list then re-render chips.
function addIfAny(val, list, render, stacked=false) {
  const v = (val||'').trim();
  if (!v) return;
  list.push(v);
  render(list, stacked);
}
addLangBtn?.addEventListener('click', () => { addIfAny(editLangInput.value, langs, (l)=>{ editLangInput.value=''; renderChips(editLangList, l); }); });
addSkillBtn?.addEventListener('click', () => { addIfAny(editSkillsInput.value, skills, (l)=>{ editSkillsInput.value=''; renderChips(editSkillsList, l); }); });
addCertBtn?.addEventListener('click', () => { addIfAny(editCertsInput.value, certs, (l)=>{ editCertsInput.value=''; renderChips(editCertsList, l, true); }, true); });

// Enter-to-add behavior
editLangInput?.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); addIfAny(editLangInput.value, langs, (l)=>{ editLangInput.value=''; renderChips(editLangList, l); }); }});
editSkillsInput?.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); addIfAny(editSkillsInput.value, skills, (l)=>{ editSkillsInput.value=''; renderChips(editSkillsList, l); }); }});
editCertsInput?.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); addIfAny(editCertsInput.value, certs, (l)=>{ editCertsInput.value=''; renderChips(editCertsList, l, true); }, true); }});
