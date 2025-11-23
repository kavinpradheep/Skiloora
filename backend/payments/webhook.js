// webhook.js - uses raw body to verify signature
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('../config/firebaseAdmin');
const crypto = require('crypto');
const { key_secret: RZ_KEY_SECRET } = require('../config/razorpay');

const router = express.Router();

// Use raw body parser for webhook signature verification
router.use(bodyParser.raw({ type: '*/*' }));

router.post('/', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const bodyBuf = req.body; // Buffer
    const expected = crypto.createHmac('sha256', RZ_KEY_SECRET).update(bodyBuf).digest('hex');

    if (expected !== signature) {
      console.warn('Webhook invalid signature', { expected, signature });
      return res.status(400).send('invalid signature');
    }

    const payload = JSON.parse(bodyBuf.toString());
    // handle payment captured events
    if (payload.event === 'payment.captured' || payload.event === 'payment.authorized') {
      const payment = payload.payload.payment.entity;
      const notes = payment.notes || {};
      const paymentDocId = notes.paymentDocId || null;

      const db = admin.firestore();

      if (paymentDocId) {
        const payRef = db.collection('payments').doc(paymentDocId);
        const paySnap = await payRef.get();
        if (paySnap.exists) {
          const payData = paySnap.data();
          if (payData.status !== 'paid') {
            await payRef.update({
              status: 'paid',
              razorpayPaymentId: payment.id,
              verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('users').doc(payData.uid).set({
              membership: {
                plan: payData.plan,
                startDate: admin.firestore.FieldValue.serverTimestamp()
              }
            }, { merge: true });
          }
        }
      } else {
        // fallback: find by order_id
        const dbRef = admin.firestore();
        const q = await dbRef.collection('payments').where('razorpayOrderId','==',payment.order_id).get();
        if (!q.empty) {
          const doc = q.docs[0];
          const payData = doc.data();
          if (payData.status !== 'paid') {
            await doc.ref.update({
              status: 'paid',
              razorpayPaymentId: payment.id,
              verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await dbRef.collection('users').doc(payData.uid).set({
              membership: { plan: payData.plan, startDate: admin.firestore.FieldValue.serverTimestamp() }
            }, { merge: true });
          }
        }
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('webhook processing error', err);
    return res.status(500).send('error');
  }
});

module.exports = router;
