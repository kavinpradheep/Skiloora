// freelancer/js/signup.js — corrected version (email check before temp-save)
(function () {
  // Detect API origin: Render in production, localhost in dev
  const API_ORIGIN = (function(){
    const h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:5000';
    return 'https://skiloora.onrender.com';
  })();
  // helper selectors
  // $(selector): Shortcut for querySelector; $$(selector): array of all matches.
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // --- Role toggle (same as before) ---
  const roleHirer = $('#role-hirer');
  const roleFreelancer = $('#role-freelancer');
  const hirerForm = $('#hirerForm');
  const freelancerForm = $('#freelancerForm');

  // showRole(role): Toggle visible form based on selected account type (hirer/freelancer).
  function showRole(role) {
    if (role === 'hirer') {
      roleHirer?.classList.add('active');
      roleHirer?.setAttribute('aria-pressed', 'true');
      roleFreelancer?.classList.remove('active');
      roleFreelancer?.setAttribute('aria-pressed', 'false');
      hirerForm?.classList.remove('hidden');
      freelancerForm?.classList.add('hidden');
    } else {
      roleFreelancer?.classList.add('active');
      roleFreelancer?.setAttribute('aria-pressed', 'true');
      roleHirer?.classList.remove('active');
      roleHirer?.setAttribute('aria-pressed', 'false');
      freelancerForm?.classList.remove('hidden');
      hirerForm?.classList.add('hidden');
    }
  }

  roleHirer?.addEventListener('click', () => showRole('hirer'));
  roleFreelancer?.addEventListener('click', () => showRole('freelancer'));
  if (!roleHirer?.classList.contains('active') && !roleFreelancer?.classList.contains('active')) {
    showRole('hirer');
  }

  // --- file preview ---
  const idProof = $('#idProof');
  const viewFileBtn = $('#viewFileBtn');
  if (idProof) {
    idProof.addEventListener('change', () => {
      if (viewFileBtn) viewFileBtn.style.display = idProof.files.length ? 'inline-block' : 'none';
    });
    viewFileBtn?.addEventListener('click', () => {
      if (!idProof.files.length) return;
      const url = URL.createObjectURL(idProof.files[0]);
      window.open(url, '_blank');
    });
  }

  // --- modal + plan logic ---
  const overlay = $('#paymentOverlay');            // overlay container
  const modal = overlay ? overlay.querySelector('.modal') : null;
  const planRadios = $$('input[name="plan"]');
  const planSelectButtons = $$('.plan-select');
  const modalContinue = $('#modalContinue');
  const modalBack = $('#modalBack');

  let currentPaymentDocId = null;
  // stable holder for temp signup doc id (use single global name)
  window.__skiloora_tempId = window.__skiloora_tempId || null;

  // showModal(): Display payment/plan selection modal and focus Back button.
  function showModal() {
    if (!overlay) return console.warn('[signup.js] overlay not found');
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    updateContinueState();
    setTimeout(() => { modalBack?.focus(); }, 50);
  }
  // closeModal(): Hide payment modal overlay.
  function closeModal() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  // updateContinueState(): Enable/disable Continue button based on plan radio selection.
  function updateContinueState() {
    if (!modalContinue) return;
    const selected = document.querySelector('input[name="plan"]:checked');
    modalContinue.disabled = !selected;
  }

  planRadios.forEach(r => r.addEventListener('change', updateContinueState));
  planSelectButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.plan-card');
      if (!card) return;
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updateContinueState();
      }
    });
  });

  modalBack?.addEventListener('click', () => closeModal());
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) closeModal(); });

  // --- Next button (from freelancer form) => check email, create temp signup, then open modal ---
    // Hirer form handler
    // handleHirer(e): Validate hirer form, check email availability, create buyer account.
    window.handleHirer = async function(e){
      e.preventDefault();
      const nameEl = document.getElementById('hirerName');
      const emailEl = document.getElementById('hirerEmail');
      const pwEl = document.getElementById('hirerPassword');
      const cpwEl = document.getElementById('hirerConfirm');
      const tos = document.getElementById('hirerTos');
      const name = nameEl?.value.trim();
      const email = emailEl?.value.trim();
      const pw = pwEl?.value || '';
      const cpw = cpwEl?.value || '';
      if (!name || !email || !pw) { alert('Fill all required fields'); return false; }
      if (pw !== cpw){ alert('Passwords do not match'); return false; }
      if (!tos?.checked){ alert('Please accept Terms'); return false; }
      try {
        const checkResp = await apiCall('/api/auth/check-email', { email });
        if (!checkResp.ok) throw new Error('Email check failed');
        if (checkResp.exists){ alert('Email already registered. Please login.'); return false; }
        await window.__createBuyerAccount({ name, email, password: pw });
        alert('Account created successfully. Please login.');
        window.location.href = './login.html';
      } catch(err){ console.error('Hirer signup failed', err); alert(err.message || 'Signup failed'); }
      return false;
    };

    // Freelancer form submit fallback (Enter key) just triggers Next button logic
    // handleFreelancer(e): Fallback submit triggers Next button logic for freelancer path.
    window.handleFreelancer = function(e){ e.preventDefault(); nextBtn?.click(); return false; };
  const nextBtn = $('#nextBtn');
  const formName = $('#freeName');
  const formEmail = $('#freeEmail');
  const formLoc = $('#freeLocation');
  const formPw = $('#freePassword');
  const formCpw = $('#freeConfirm');

  // getIdToken(): Retrieve fresh Firebase auth token if user is logged in.
  async function getIdToken() {
    if (window.firebaseAuth && firebaseAuth.currentUser) {
      try { return await firebaseAuth.currentUser.getIdToken(true); } catch (err) { console.warn('getIdToken error', err); return null; }
    }
    return null;
  }

  // apiCall(path, body): POST helper to backend with optional Authorization header.
  async function apiCall(path, body) {
    const API_BASE = API_ORIGIN;
    const token = await getIdToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('API error', res.status, json);
      throw new Error(json.error || json.message || 'API error');
    }
    return json;
  }

  // Next button click: Validate freelancer form, check email, create temp signup, open payment modal.
  nextBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = formName?.value?.trim() || '';
    const email = formEmail?.value?.trim() || '';
    const pw = formPw?.value || '';
    const cpw = formCpw?.value || '';

    if (!name || !email || !pw) {
      alert('Please fill required fields (name, email, password).');
      return;
    }
    if (pw !== cpw) {
      alert('Passwords do not match.');
      return;
    }

    try {
      // 1) Check if email already exists
      const checkResp = await apiCall('/api/auth/check-email', { email });
      if (!checkResp || !checkResp.ok) {
        console.warn('check-email response', checkResp);
        alert('Could not verify email. Please try again.');
        return;
      }
      if (checkResp.exists) {
        if (checkResp.source === 'auth' || checkResp.source === 'firestore') {
          alert('An account with this email already exists. Please log in instead.');
        } else if (checkResp.source === 'temp') {
          alert('A signup for this email is pending payment. Please use the login flow or try again later.');
        } else {
          alert('An account with this email exists. Please log in.');
        }
        return;
      }

      // 2) Email is free — create temp signup
      const tempResp = await apiCall('/api/auth/temp-save', {
        name,
        email,
        password: pw,
        location: formLoc?.value || ''
      });
      if (tempResp && tempResp.tempId) {
        // store globally so create-order can send it
        window.__skiloora_tempId = tempResp.tempId;
        console.log('tempId saved:', tempResp.tempId);
        // show the payment modal
        showModal();
      } else {
        throw new Error('Failed to save temp signup');
      }
    } catch (err) {
      console.error('Temp save / check failed', err);
      alert(err && err.message ? err.message : 'Failed to save signup data. Try again.');
    }
  });

  // --- modal Continue (create order -> open Razorpay -> verify) ---
  // Continue button: Create payment order, open Razorpay checkout, verify on success, rollback on failure.
  modalContinue?.addEventListener('click', async () => {
    try {
      const selected = document.querySelector('input[name="plan"]:checked');
      if (!selected) { alert('Select a plan'); return; }
      const plan = selected.value;
      console.log('Selected plan:', plan);

      if (!window.__skiloora_tempId) {
        alert('Temp signup missing. Please click Next again.');
        return;
      }

      // call backend to create order (send tempId)
      const createResp = await apiCall('/api/payments/create-order', { plan, tempId: window.__skiloora_tempId });
      console.log('create-order resp', createResp);

      const { razorpayOrderId, amount, currency, razorpayKeyId } = createResp || {};
      currentPaymentDocId = createResp.paymentDocId || null;
      console.log('stored paymentDocId =>', currentPaymentDocId);

      if (!razorpayOrderId || !razorpayKeyId) { alert('Server didn\'t return order info. Check console/server logs.'); console.error('Missing order_id or key_id', createResp); return; }
      if (typeof Razorpay === 'undefined') { alert('Razorpay library not loaded. Add <script src="https://checkout.razorpay.com/v1/checkout.js"></script> in head.'); return; }

      const options = {
        key: razorpayKeyId,
        amount,
        currency,
        name: 'Skiloora',
        description: `Membership: ${plan}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          console.log('razorpay success handler response', response);
          try {
            const verifyResp = await apiCall('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentDocId: currentPaymentDocId
            });
            console.log('verifyResp', verifyResp);
            if (verifyResp.ok) {
              // success: temp doc consumed server-side & final user created
              alert('Payment successful — membership activated!');
              // clear local temp id and go to login
              window.__skiloora_tempId = null;
              closeModal();
              window.location.href = '/freelancer/html/login.html';
            } else {
              alert('Verification failed. Check server logs.');
            }
          } catch (err) {
            console.error('verify error', err);
            alert('Payment verification failed. If charged, contact support.');
          }
        },
        prefill: { email: (window.firebaseAuth && firebaseAuth.currentUser) ? firebaseAuth.currentUser.email : (formEmail?.value || '') },
        theme: { color: '#111827' }
      };

      console.log('Opening Razorpay with options:', options);
      const rzp = new Razorpay(options);

      // on payment failed -> delete temp signup to rollback
      if (rzp.on) {
        rzp.on('payment.failed', async function (response) {
          console.warn('Payment failed handler:', response);
          if (window.__skiloora_tempId) {
            try {
              await apiCall('/api/auth/temp-delete', { tempId: window.__skiloora_tempId });
              console.log('Temp signup removed:', window.__skiloora_tempId);
              window.__skiloora_tempId = null;
            } catch (err) {
              console.error('Failed to delete temp signup on payment failure', err);
            }
          }
          alert('Payment failed, your signup was cancelled. Please try again.');
        });
      }

      rzp.open();

    } catch (err) {
      console.error('Payment flow error', err);
      alert('Failed to start payment: ' + (err.message || err));
    }
  });

  // expose helpers for debugging
  window.__skiloora = window.__skiloora || {};
  window.__skiloora.showModal = showModal;
  window.__skiloora.closeModal = closeModal;
  window.__skiloora.updateContinueState = updateContinueState;

  updateContinueState();
})();
