// backend/payments/payment.controller.js
const admin = require('../config/firebaseAdmin');
const { razorpay, key_id: RZ_KEY_ID, key_secret: RZ_KEY_SECRET } = require('../config/razorpay');
const crypto = require('crypto');

const db = admin.firestore();

const PLANS = {
  standard: { amount: 299900, label: 'Standard' },
  premium: { amount: 399900, label: 'Premium' }
};

exports.createOrder = async (req, res) => {
  console.log("===== CREATE ORDER HIT =====");
  console.log("Request body:", req.body);

  try {
    const { plan, userData, tempId } = req.body; // accept either userData (old flow) or tempId (preferred)

    if (!plan || !PLANS[plan]) {
      console.log("❌ Invalid plan received");
      return res.status(400).json({ error: "Invalid plan" });
    }

    const { amount, label } = PLANS[plan];
    console.log("Using amount:", amount);

    // FIRESTORE test
    console.log("Checking Firestore access...");
    const testRef = await db.collection("testConnection").add({
      msg: "Testing firestore",
      ts: new Date(),
    });
    console.log("Firestore write OK with ID:", testRef.id);

    console.log("Testing Razorpay instance...");
    console.log("KEY_ID:", RZ_KEY_ID ? "LOADED" : "MISSING");
    console.log("KEY_SECRET:", RZ_KEY_SECRET ? "LOADED" : "MISSING");

    // Determine safe userData for storing (do not store password)
    let safeUserData = null;
    if (userData) {
      safeUserData = { ...userData };
      if (safeUserData.password) delete safeUserData.password;
    }

    // create payment doc, reference the temp signup if provided
    const paymentRef = await db.collection("payments").add({
      plan,
      label,
      amount,
      currency: "INR",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userData: safeUserData || null,
      tempSignupId: tempId || null
    });

    console.log("Firestore payment doc created:", paymentRef.id);
    console.log("Creating Razorpay order...");

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${paymentRef.id}`
    });

    console.log("Razorpay order created:", order);

    await paymentRef.update({ razorpayOrderId: order.id });

    return res.json({
      ok: true,
      razorpayOrderId: order.id,
      amount,
      currency: "INR",
      paymentDocId: paymentRef.id,
      razorpayKeyId: RZ_KEY_ID
    });

  } catch (err) {
    console.log("🔥 ERROR IN CREATE ORDER");
    console.error(err);
    return res.status(500).json({
      error: "server_error",
      message: err.message
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDocId } = req.body;
    console.log('VERIFY PAYMENT HIT, body:', req.body);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentDocId) {
      console.warn('Missing fields in verifyPayment', { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDocId });
      return res.status(400).json({ error: 'missing_fields', details: 'razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDocId required' });
    }

    // verify signature
    const hmac = crypto.createHmac('sha256', RZ_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const expected = hmac.digest('hex');
    if (expected !== razorpaySignature) {
      console.warn('Invalid signature', { expected, got: razorpaySignature });
      return res.status(400).json({ error: 'invalid_signature' });
    }

    // fetch payment doc
    const payRef = db.collection('payments').doc(paymentDocId);
    const paySnap = await payRef.get();
    if (!paySnap.exists) {
      console.warn('Payment doc not found:', paymentDocId);
      return res.status(404).json({ error: 'payment_not_found', paymentDocId });
    }
    const payData = paySnap.data();
    console.log('Payment doc data:', payData);

    // update payment status to paid (so we don't double-handle)
    await payRef.update({
      status: 'paid',
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // tempSignup flow
    const tempId = payData.tempSignupId;
    if (!tempId) {
      console.warn('No tempSignupId associated with payment:', paymentDocId);
      // still return ok, but signal missing temp signup
      return res.json({ ok: true, warning: 'no_temp_signup_found', paymentDocId });
    }

    const tempSnap = await db.collection('tempSignups').doc(tempId).get();
    if (!tempSnap.exists) {
      console.warn('Temp signup doc missing:', tempId);
      return res.status(404).json({ error: 'temp_signup_not_found', tempId });
    }
    const temp = tempSnap.data();
    console.log('Temp signup data (DEBUG):', { tempId, email: temp.email, hasPassword: !!temp.password });

    // ensure email + password exist
    const userEmail = (temp.email || '').toLowerCase().trim();
    const userPassword = temp.password || null;
    const displayName = temp.name || '';

    if (!userEmail) {
      console.error('Temp signup missing email:', tempId);
      return res.status(400).json({ error: 'temp_missing_email', tempId });
    }
    if (!userPassword) {
      console.error('Temp signup missing password (cannot create auth user):', tempId);
      // if you want to create account without password, you must use password-reset flow.
      return res.status(400).json({ error: 'temp_missing_password', tempId });
    }

    // create firebase auth user
    try {
      const userRecord = await admin.auth().createUser({
        email: userEmail,
        password: userPassword,
        displayName: displayName || undefined
      });
      const uid = userRecord.uid;
      console.log('Created Firebase Auth user:', uid);

      // create Firestore user doc
      await db.collection('users').doc(uid).set({
        name: displayName || undefined,
        email: userEmail,
        isFreelancer: true,
        membership: {
          plan: payData.plan,
          startDate: admin.firestore.FieldValue.serverTimestamp()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // attach uid to payment doc
      await payRef.update({ uid });

      // delete temp signup securely
      await db.collection('tempSignups').doc(tempId).delete();
      console.log('Deleted temp signup after successful create:', tempId);

      return res.json({ ok: true, uid });
    } catch (createErr) {
      console.error('Error creating Firebase Auth user:', createErr && createErr.message ? createErr.message : createErr);
      // Try to lookup existing user by email (email collision)
      try {
        const existing = await admin.auth().getUserByEmail(userEmail);
        const uid = existing.uid;
        console.log('Existing Firebase user found:', uid);
        // merge membership
        await db.collection('users').doc(uid).set({
          membership: {
            plan: payData.plan,
            startDate: admin.firestore.FieldValue.serverTimestamp()
          },
          isFreelancer: true,
        }, { merge: true });

        await payRef.update({ uid });

        // delete temp signup anyway
        await db.collection('tempSignups').doc(tempId).delete().catch(() => {});
        return res.json({ ok: true, uid, note: 'used_existing_auth_user' });
      } catch (lookupErr) {
        console.error('Lookup-by-email also failed:', lookupErr && lookupErr.message ? lookupErr.message : lookupErr);
        return res.status(500).json({ error: 'create_user_failed', message: createErr.message || String(createErr) });
      }
    }
  } catch (err) {
    console.error('verifyPayment error (outer):', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    return res.status(500).json({ error: 'server_error', message: err.message || String(err) });
  }
};
