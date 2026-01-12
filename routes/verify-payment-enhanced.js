const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// ✅ OPTIONAL TELEGRAM (safe even if it fails)
let sendTelegramAlert = async () => {};
try {
  ({ sendTelegramAlert } = require('../utils/telegram'));
} catch (e) {
  console.log('ℹ️ Telegram disabled');
}

// Razorpay credentials
const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

console.log('🔥 verify-payment-enhanced ROUTES LOADED');

/* =========================================================
   CREATE ORDER  → /api/create-order
========================================================= */
router.post('/create-order', async (req, res) => {
  console.log('🟢 CREATE ORDER HIT');
  console.log('🟡 BODY:', req.body);

  try {
    const { amount, subscription_type, duration, username } = req.body;

    if (!amount || !subscription_type || !username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { subscription_type, duration, username }
    });

    console.log('✅ Razorpay order created:', order.id);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: credentials.key_id
    });

  } catch (err) {
    console.error('❌ CREATE ORDER ERROR:', err);
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   VERIFY PAYMENT  → /api/verify-payment
========================================================= */
router.post('/verify-payment', async (req, res) => {
  console.log('🟢 VERIFY PAYMENT HIT');
  console.log('🟡 PAYLOAD:', req.body);

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscription_type,
      username,
      address,
      latitude,
      longitude
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !subscription_type ||
      !username
    ) {
      return res.status(400).json({ success: false });
    }

    /* ---------- SIGNATURE CHECK ---------- */
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Signature mismatch');
      return res.status(400).json({ success: false });
    }

    /* ---------- PAYMENT STATUS ---------- */
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!['authorized', 'captured'].includes(payment.status)) {
      return res.status(400).json({ success: false });
    }

    /* ---------- USER ---------- */
    const [users] = await db.execute(
      'SELECT id, email, name, phone FROM users WHERE LOWER(email)=LOWER(?)',
      [username]
    );

    if (!users.length) {
      console.error('❌ User not found');
      return res.status(400).json({ success: false });
    }

    const user = users[0];

    /* =====================================================
       SINGLE ORDER → TOMORROW MORNING DELIVERY
    ===================================================== */
    if (subscription_type === 'single_order') {

      await db.execute(
        `INSERT INTO orders (
          user_id,
          user_email,
          order_type,
          total_amount,
          order_status,
          delivery_date,
          delivery_slot,
          address,
          latitude,
          longitude,
          payment_id
        ) VALUES (?, ?, 'single', ?, 'paid',
          DATE_ADD(CURDATE(), INTERVAL 1 DAY),
          'morning', ?, ?, ?, ?)`
        ,
        [
          user.id,
          user.email,
          payment.amount / 100,
          address || '',
          latitude || null,
          longitude || null,
          razorpay_payment_id
        ]
      );

      console.log('✅ ORDER INSERTED INTO DB');

      // 🔔 Telegram (non-blocking)
      try {
        await sendTelegramAlert(
          `🥛 <b>NEW SINGLE ORDER</b>\n\n` +
          `👤 ${user.name}\n📞 ${user.phone}\n` +
          `💰 ₹${payment.amount / 100}\n` +
          `🚚 Delivery: Tomorrow Morning\n\n` +
          `📍 ${address}`
        );
      } catch (e) {
        console.error('Telegram failed');
      }

      return res.json({
        success: true,
        message: 'Single order placed successfully'
      });
    }

    return res.status(400).json({ success: false });

  } catch (err) {
    console.error('❌ VERIFY PAYMENT ERROR:', err);
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   PAYMENT STATUS CHECK
========================================================= */
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  const [rows] = await db.execute(
    'SELECT * FROM orders WHERE payment_id = ?',
    [req.params.payment_id]
  );

  if (!rows.length) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, order: rows[0] });
});

module.exports = router;
