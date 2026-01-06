const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// ✅ TELEGRAM ALERT UTILITY
const { sendTelegramAlert } = require('../utils/telegram');

// Import centralized Razorpay configuration
const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

// Helper to format date for MySQL
const formatDateForMySQL = (date) =>
  date.toISOString().slice(0, 19).replace('T', ' ');

// Helper to calculate subscription amount
function calculateAmount(type, duration) {
  const prices = {
    '500ml': { '6days': 300, '15days': 750 },
    '1000ml': { '6days': 570, '15days': 1425 }
  };
  return prices[type]?.[duration] || 0;
}

// ----------------- CREATE ORDER -----------------
router.post('/create-order', async (req, res) => {
  try {
    const { amount, subscription_type, duration, username } = req.body;

    console.log('Creating order with data:', {
      amount,
      subscription_type,
      duration,
      username
    });

    if (!amount || !subscription_type || !duration || !username) {
      const missingFields = [];
      if (!amount) missingFields.push('amount');
      if (!subscription_type) missingFields.push('subscription_type');
      if (!duration) missingFields.push('duration');
      if (!username) missingFields.push('username');

      return res.status(400).json({
        success: false,
        message: 'Missing required order fields',
        missing_fields: missingFields
      });
    }

    const testAmount = parseFloat(amount);

    const options = {
      amount: Math.round(testAmount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { subscription_type, duration, username }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: credentials.key_id
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// ----------------- VERIFY PAYMENT -----------------
router.post('/verify-payment', async (req, res) => {
  const startTime = Date.now();
  console.log('=== PAYMENT VERIFICATION STARTED ===');

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
      latitude,
      longitude,
      username
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!razorpay_order_id) missingFields.push('razorpay_order_id');
    if (!razorpay_payment_id) missingFields.push('razorpay_payment_id');
    if (!razorpay_signature) missingFields.push('razorpay_signature');
    if (!subscription_type) missingFields.push('subscription_type');
    if (!duration) missingFields.push('duration');
    if (!username) missingFields.push('username');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
        missing_fields: missingFields
      });
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!['authorized', 'captured'].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    const amount = calculateAmount(subscription_type, duration);

    const startDate = new Date();
    const daysToAdd = duration === '6days' ? 7 : 17;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToAdd);

    const [rows] = await db.execute(
      `SELECT id, name, email, phone FROM users WHERE LOWER(email) = LOWER(?)`,
      [username]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];

    const fullAddress =
      address || [building_name, flat_number, landmark].filter(Boolean).join(', ');

    await db.execute(
      `UPDATE users SET
        subscription_type = ?,
        subscription_duration = ?,
        subscription_status = 'active',
        subscription_start_date = ?,
        subscription_end_date = ?,
        subscription_amount = ?,
        subscription_total_amount = ?,
        subscription_address = ?,
        subscription_building_name = ?,
        subscription_flat_number = ?,
        subscription_payment_id = ?,
        subscription_created_at = NOW(),
        subscription_updated_at = NOW()
      WHERE LOWER(email) = LOWER(?)`,
      [
        subscription_type,
        duration,
        formatDateForMySQL(startDate),
        formatDateForMySQL(endDate),
        amount,
        amount,
        fullAddress,
        building_name || '',
        flat_number || '',
        razorpay_payment_id,
        username
      ]
    );

    // 🔔 TELEGRAM ADMIN ALERT (NON-BLOCKING)
    try {
      await sendTelegramAlert(
        `🥛 <b>NEW ORDER RECEIVED</b>\n\n` +
        `👤 <b>Name:</b> ${user.name || 'N/A'}\n` +
        `📧 <b>Email:</b> ${user.email}\n` +
        `📞 <b>Phone:</b> ${user.phone || 'N/A'}\n\n` +
        `📦 <b>Type:</b> ${subscription_type}\n` +
        `⏳ <b>Duration:</b> ${duration}\n` +
        `💰 <b>Amount:</b> ₹${amount}\n\n` +
        `📍 <b>Address:</b>\n${fullAddress}\n\n` +
        `🕒 ${new Date().toLocaleString()}`
      );
    } catch (tgErr) {
      console.error('Telegram alert failed:', tgErr.message);
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription created successfully',
      subscription_id: razorpay_payment_id
    });

  } catch (error) {
    console.error('PAYMENT VERIFICATION FAILED:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// ----------------- CHECK PAYMENT STATUS -----------------
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;

    const [rows] = await db.execute(
      `SELECT subscription_type, subscription_duration, subscription_status,
              subscription_start_date, subscription_end_date, subscription_amount,
              subscription_address
       FROM users WHERE subscription_payment_id = ?`,
      [payment_id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      subscription: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
});

module.exports = router;
