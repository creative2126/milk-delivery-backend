const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');
const { sendTelegramAlert } = require('../utils/telegram');
const { getCredentials } = require('../razorpay-config');

const credentials = getCredentials();

const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

/* ================= VERIFY PAYMENT ================= */
router.post('/verify-payment', async (req, res) => {
  console.log("🟢 VERIFY PAYMENT HIT");
  console.log("🟡 BODY:", req.body);

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

    /* -------- HARD VALIDATION (MINIMAL) -------- */
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !subscription_type ||
      !username
    ) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ success: false });
    }

    /* -------- SIGNATURE VERIFY -------- */
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Signature mismatch");
      return res.status(400).json({ success: false });
    }

    /* -------- FETCH PAYMENT -------- */
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!['authorized', 'captured'].includes(payment.status)) {
      console.error("❌ Payment not captured");
      return res.status(400).json({ success: false });
    }

    /* -------- USER -------- */
    const [users] = await db.execute(
      `SELECT id, email, name, phone FROM users WHERE LOWER(email)=LOWER(?)`,
      [username]
    );

    if (!users.length) {
      console.error("❌ User not found");
      return res.status(400).json({ success: false });
    }

    const user = users[0];

    /* ================= SINGLE ORDER ================= */
    if (subscription_type === 'single_order') {
      console.log("🟢 INSERTING SINGLE ORDER");

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
          'morning', ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          payment.amount / 100,
          address || 'N/A',
          latitude || null,
          longitude || null,
          razorpay_payment_id
        ]
      );

      /* -------- TELEGRAM -------- */
      await sendTelegramAlert(
        `🥛 <b>NEW SINGLE ORDER</b>\n\n` +
        `👤 ${user.name}\n📞 ${user.phone}\n` +
        `💰 ₹${payment.amount / 100}\n` +
        `🚚 Delivery: Tomorrow Morning\n\n` +
        `📍 ${address || 'N/A'}`
      );

      console.log("✅ ORDER INSERTED");

      return res.json({
        success: true,
        message: 'Single order placed'
      });
    }

    /* -------- FALLBACK -------- */
    return res.status(400).json({ success: false });

  } catch (err) {
    console.error("🔥 VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
