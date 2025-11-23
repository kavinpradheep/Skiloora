// freelancer/js/signup.js — corrected version
(function () {
  // helper selectors
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // --- Role toggle (same as before) ---
  const roleHirer = $('#role-hirer');
  const roleFreelancer = $('#role-freelancer');
  const hirerForm = $('#hirerForm');
  const freelancerForm = $('#freelancerForm');

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

  function showModal() {
    if (!overlay) return console.warn('[signup.js] overlay not found');
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    updateContinueState();
    setTimeout(() => { modalBack?.focus(); }, 50);
  }
  function closeModal() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

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

  // --- Next button (from freelancer form) => create temp signup, then open modal ---
  const nextBtn = $('#nextBtn');
  const formName = $('#freeName');
  const formEmail = $('#freeEmail');
  const formLoc = $('#freeLocation');
  const formPw = $('#freePassword');
  const formCpw = $('#freeConfirm');

  async function getIdToken() {
    if (window.firebaseAuth && firebaseAuth.currentUser) {
      try { return await firebaseAuth.currentUser.getIdToken(true); } catch (err) { console.warn('getIdToken error', err); return null; }
    }
    return null;
  }

  async function apiCall(path, body) {
    const API_BASE = 'http://localhost:5000';
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

    // Save temp signup to backend
    try {
      const tempResp = await apiCall('/api/auth/temp-save', {
        name,
        email,
        password: pw,
        location: formLoc?.value || ''
      });
      if (tempResp && tempResp.tempId) {
        // store globally so create-order can send it (use single global var)
        window.__skiloora_tempId = tempResp.tempId;
        console.log('tempId saved:', tempResp.tempId);
        // show the payment modal
        showModal();
      } else {
        throw new Error('Failed to save temp signup');
      }
    } catch (err) {
      console.error('Temp save failed', err);
      alert('Failed to save signup data. Try again.');
    }
  });

  // --- modal Continue (create order -> open Razorpay -> verify) ---
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
