// razorpay.js
const Razorpay = require('razorpay');

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.warn('Razorpay keys not found in env. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
}

const razorpay = new Razorpay({
  key_id,
  key_secret
});

module.exports = { razorpay, key_id, key_secret };
