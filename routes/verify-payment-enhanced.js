const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// Telegram utility (safe)
const { sendTelegramAlert } = require('../utils/telegram');

// Razorpay credentials
const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

/* ======================================================
   🔔 FILE LOAD CONFIRMATION (VERY IMPORTANT)
====================================================== */
console.log('✅ verify-payment.js FILE LOADED');

/* ======================================================
   CREATE ORDER
====================================================== */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, subscription_type, username } = req.body;

    console.log('🟡 CREATE ORDER BODY:', req.body);

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
      notes: { subscription_type, username }
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

/* ======================================================
   VERIFY PAYMENT
====================================================== */
router.post('/verify-payment', async (req, res) => {
  console.log('🚀 VERIFY PAYMENT API HIT');
  console.log('📦 BODY:', req.body);

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscription_type,
      address,
      latitude,
      longitude,
      username
    } = req.body;

    /* ---------- BASIC VALIDATION ---------- */
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !subscription_type ||
      !username
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    /* ---------- SIGNATURE VERIFICATION ---------- */
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Signature mismatch');
      return res.status(400).json({ success: false });
    }

    /* ---------- PAYMENT STATUS ---------- */
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log('💰 PAYMENT STATUS:', payment.status);

    if (!['authorized', 'captured'].includes(payment.status)) {
      return res.status(400).json({ success: false });
    }

    /* ---------- FETCH USER ---------- */
    const [users] = await db.execute(
      `SELECT id, email, name, phone FROM users WHERE LOWER(email)=LOWER(?)`,
      [username]
    );

    if (!users.length) {
      console.error('❌ USER NOT FOUND');
      return res.status(400).json({ success: false });
    }

    const user = users[0];

    /* ======================================================
       🥛 SINGLE ORDER → TOMORROW MORNING DELIVERY
    ======================================================= */
    if (subscription_type === 'single_order') {

      console.log('🟢 INSERTING SINGLE ORDER');

      try {
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
            'morning', ?, ?, ?, ?
          )`,
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

      } catch (dbErr) {
        console.error('❌ DB INSERT FAILED:', dbErr);
        throw dbErr;
      }

      /* ---------- TELEGRAM (NON-BLOCKING) ---------- */
      try {
        await sendTelegramAlert(
          `🥛 <b>NEW SINGLE ORDER</b>\n\n` +
          `👤 ${user.name}\n📞 ${user.phone}\n` +
          `💰 ₹${payment.amount / 100}\n` +
          `🚚 Delivery: Tomorrow Morning\n\n` +
          `📍 ${address}`
        );
      } catch (tgErr) {
        console.error('⚠️ Telegram failed:', tgErr.message);
      }

      return res.json({
        success: true,
        message: 'Single order placed successfully'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid order type'
    });

  } catch (err) {
    console.error('❌ VERIFY PAYMENT ERROR:', err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   PAYMENT STATUS CHECK
====================================================== */
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT * FROM orders WHERE payment_id = ?`,
    [req.params.payment_id]
  );

  if (!rows.length) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, order: rows[0] });
});

module.exports = router;
