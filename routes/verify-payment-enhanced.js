const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// 🔔 Telegram utility
const { sendTelegramAlert } = require('../utils/telegram');

// Razorpay credentials
const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

// ===================== CREATE ORDER =====================
router.post('/create-order', async (req, res) => {
  try {
    console.log('🟡 CREATE ORDER BODY:', req.body);

    const { amount, subscription_type, duration, username } = req.body;

    if (!amount || !subscription_type || !username) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
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

// ===================== VERIFY PAYMENT =====================
router.post('/verify-payment', async (req, res) => {
  try {
    console.log('🔥 VERIFY PAYMENT HIT');
    console.log('🟡 VERIFY BODY:', req.body);

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
      console.log('❌ Missing verify fields');
      return res.status(400).json({ success: false });
    }

    // ---------- SIGNATURE CHECK ----------
    const generatedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.log('❌ Signature mismatch');
      return res.status(400).json({ success: false });
    }

    console.log('✅ Signature verified');

    // ---------- PAYMENT STATUS ----------
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log('🟢 Payment status:', payment.status);

    if (!['authorized', 'captured'].includes(payment.status)) {
      return res.status(400).json({ success: false });
    }

    // ---------- USER ----------
    const [users] = await db.execute(
      `SELECT id, name, email, phone FROM users WHERE LOWER(email)=LOWER(?)`,
      [username]
    );

    if (!users.length) {
      console.log('❌ User not found');
      return res.status(400).json({ success: false });
    }

    const user = users[0];

    // =====================================================
    // 🥛 SINGLE ORDER → NEXT DAY MORNING DELIVERY
    // =====================================================
    if (subscription_type === 'single_order') {

      console.log('🟢 SINGLE ORDER FLOW');

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
          payment_id,
          created_at
        ) VALUES (?, ?, 'single', ?, 'paid',
          DATE_ADD(CURDATE(), INTERVAL 1 DAY),
          'morning', ?, ?, ?, ?, NOW())`,
        [
          user.id,
          user.email,
          payment.amount / 100,
          address,
          latitude || null,
          longitude || null,
          razorpay_payment_id
        ]
      );

      console.log('✅ Order inserted into DB');

      // 🔔 Telegram
      try {
        await sendTelegramAlert(
          `🥛 <b>NEW SINGLE ORDER</b>\n\n` +
          `👤 ${user.name}\n📞 ${user.phone}\n` +
          `💰 ₹${payment.amount / 100}\n` +
          `🚚 Delivery: Tomorrow Morning\n\n` +
          `📍 ${address}`
        );
      } catch (e) {
        console.error('Telegram error:', e.message);
      }

      return res.json({
        success: true,
        message: 'Single order placed successfully'
      });
    }

    // =====================================================
    // 🔁 SUBSCRIPTIONS (unchanged)
    // =====================================================
    return res.json({
      success: true,
      message: 'Subscription flow handled elsewhere'
    });

  } catch (err) {
    console.error('❌ VERIFY PAYMENT ERROR:', err);
    res.status(500).json({ success: false });
  }
});

// ===================== PAYMENT STATUS =====================
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
