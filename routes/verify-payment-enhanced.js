const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// ✅ TELEGRAM ALERT
const { sendTelegramAlert } = require('../utils/telegram');

// Razorpay credentials
const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

// Helper: format date for MySQL
const formatDateForMySQL = (date) =>
  date.toISOString().slice(0, 19).replace('T', ' ');

// Subscription pricing
function calculateAmount(type, duration) {
  const prices = {
    '500ml': { '6days': 300, '15days': 750 },
    '1000ml': { '6days': 570, '15days': 1425 }
  };
  return prices[type]?.[duration] || 0;
}

/* =====================================================
   CREATE RAZORPAY ORDER
===================================================== */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, subscription_type, duration, username } = req.body;

    if (!amount || !subscription_type || !username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order fields'
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { subscription_type, duration, username }
    });

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: credentials.key_id
    });

  } catch (error) {
    console.error('❌ CREATE ORDER ERROR:', error);
    res.status(500).json({ success: false });
  }
});

/* =====================================================
   VERIFY PAYMENT
===================================================== */
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscription_type,
      duration,
      address,
      building_name,
      flat_number,
      landmark,
      username
    } = req.body;

    // ---------- BASIC VALIDATION ----------
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !subscription_type ||
      !username
    ) {
      return res.status(400).json({ success: false });
    }

    // ---------- VERIFY SIGNATURE ----------
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    // ---------- VERIFY PAYMENT ----------
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!['authorized', 'captured'].includes(payment.status)) {
      return res.status(400).json({ success: false });
    }

    // ---------- FETCH USER ----------
    const [users] = await db.execute(
      `SELECT id, name, email, phone FROM users WHERE LOWER(email)=LOWER(?)`,
      [username]
    );

    if (!users.length) {
      return res.status(400).json({ success: false });
    }

    const user = users[0];
    const fullAddress =
      address || [building_name, flat_number, landmark].filter(Boolean).join(', ');

    /* =====================================================
       🥛 SINGLE ORDER (DELIVER TOMORROW MORNING)
    ===================================================== */
    if (subscription_type === 'single_order') {

      await db.execute(
        `INSERT INTO orders (
          user_id,
          email,
          total_amount,
          payment_id,
          order_type,
          order_status,
          address,
          created_at
        ) VALUES (?, ?, ?, ?, 'single', 'paid', ?, NOW())`,
        [
          user.id,
          user.email,
          payment.amount / 100,
          razorpay_payment_id,
          fullAddress
        ]
      );

      console.log('✅ SINGLE ORDER INSERTED INTO orders TABLE');

      // 🔔 TELEGRAM ALERT
      try {
        await sendTelegramAlert(
          `🥛 <b>NEW SINGLE ORDER</b>\n\n` +
          `👤 ${user.name}\n` +
          `📞 ${user.phone}\n\n` +
          `💰 ₹${payment.amount / 100}\n` +
          `🚚 Delivery: Tomorrow Morning\n\n` +
          `📍 ${fullAddress}`
        );
      } catch (tgErr) {
        console.error('Telegram failed:', tgErr.message);
      }

      return res.json({
        success: true,
        message: 'Single order placed successfully'
      });
    }

    /* =====================================================
       🔁 SUBSCRIPTION FLOW (USERS TABLE)
    ===================================================== */
    const amount = calculateAmount(subscription_type, duration);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (duration === '6days' ? 7 : 17));

    await db.execute(
      `UPDATE users SET
        subscription_type=?,
        subscription_duration=?,
        subscription_status='active',
        subscription_start_date=?,
        subscription_end_date=?,
        subscription_amount=?,
        subscription_total_amount=?,
        subscription_address=?,
        subscription_payment_id=?,
        subscription_updated_at=NOW()
      WHERE LOWER(email)=LOWER(?)`,
      [
        subscription_type,
        duration,
        formatDateForMySQL(startDate),
        formatDateForMySQL(endDate),
        amount,
        amount,
        fullAddress,
        razorpay_payment_id,
        username
      ]
    );

    // 🔔 TELEGRAM ALERT
    try {
      await sendTelegramAlert(
        `📦 <b>NEW SUBSCRIPTION</b>\n\n` +
        `👤 ${user.name}\n` +
        `🍼 ${subscription_type}\n` +
        `⏳ ${duration}\n` +
        `💰 ₹${amount}\n\n` +
        `📍 ${fullAddress}`
      );
    } catch (tgErr) {
      console.error('Telegram failed:', tgErr.message);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('❌ VERIFY PAYMENT ERROR:', error);
    res.status(500).json({ success: false });
  }
});

/* =====================================================
   CHECK PAYMENT STATUS (ORDERS TABLE)
===================================================== */
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM orders WHERE payment_id = ?`,
      [req.params.payment_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, order: rows[0] });

  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
