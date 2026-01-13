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
      console.error('❌ Missing required fields');
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
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/* =========================================================
   VERIFY PAYMENT  → /api/verify-payment
========================================================= */
router.post('/verify-payment', async (req, res) => {
  console.log('🟢 VERIFY PAYMENT HIT');
  console.log('🟡 FULL PAYLOAD:', JSON.stringify(req.body, null, 2));

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscription_type,
      duration,
      username,
      address,
      building_name,
      flat_number,
      landmark,
      latitude,
      longitude
    } = req.body;

    /* ---------- VALIDATION ---------- */
    console.log('🔍 Step 1: Validating required fields...');
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing Razorpay fields');
      console.error('Order ID:', razorpay_order_id);
      console.error('Payment ID:', razorpay_payment_id);
      console.error('Signature:', razorpay_signature);
      return res.status(400).json({ 
        success: false, 
        error: 'Missing payment details' 
      });
    }

    if (!subscription_type || !username) {
      console.error('❌ Missing subscription_type or username');
      console.error('Subscription Type:', subscription_type);
      console.error('Username:', username);
      return res.status(400).json({ 
        success: false, 
        error: 'Missing order details' 
      });
    }

    console.log('✅ All required fields present');

    /* ---------- SIGNATURE CHECK ---------- */
    console.log('🔐 Step 2: Verifying signature...');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Received Signature:', razorpay_signature);
    console.log('Using Key Secret:', credentials.key_secret.substring(0, 10) + '...');
    
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    console.log('Text to sign:', text);
    
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(text)
      .digest('hex');

    console.log('Expected Signature:', expectedSignature);
    console.log('Signatures Match:', expectedSignature === razorpay_signature);

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ SIGNATURE MISMATCH!');
      console.error('Expected:', expectedSignature);
      console.error('Received:', razorpay_signature);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid signature - payment verification failed' 
      });
    }

    console.log('✅ Signature verified successfully');

    /* ---------- PAYMENT STATUS CHECK ---------- */
    console.log('💳 Step 3: Fetching payment status from Razorpay...');
    
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
      console.log('Payment Status:', payment.status);
      console.log('Payment Amount:', payment.amount / 100);
      console.log('Payment Method:', payment.method);
    } catch (err) {
      console.error('❌ Failed to fetch payment from Razorpay:', err.message);
      return res.status(400).json({ 
        success: false, 
        error: 'Could not verify payment with Razorpay' 
      });
    }

    if (!['authorized', 'captured'].includes(payment.status)) {
      console.error('❌ Payment not completed. Status:', payment.status);
      return res.status(400).json({ 
        success: false, 
        error: `Payment not completed. Status: ${payment.status}` 
      });
    }

    console.log('✅ Payment status valid:', payment.status);

    /* ---------- USER LOOKUP ---------- */
    console.log('👤 Step 4: Looking up user:', username);
    
    let users;
    try {
      const dbResult = await db.execute(
        'SELECT id, email, name, phone FROM users WHERE LOWER(email)=LOWER(?)',
        [username]
      );
      
      console.log('📊 DEBUG - DB Result type:', typeof dbResult);
      console.log('📊 DEBUG - DB Result is array:', Array.isArray(dbResult));
      console.log('📊 DEBUG - DB Result length:', dbResult?.length);
      
      // Handle different db.execute return formats
      if (Array.isArray(dbResult) && dbResult.length > 0) {
        users = Array.isArray(dbResult[0]) ? dbResult[0] : dbResult;
      } else {
        users = [];
      }
      
      console.log('📊 DEBUG - Extracted users:', users);
      console.log('📊 DEBUG - Users count:', users?.length);
      
    } catch (err) {
      console.error('❌ Database error during user lookup:', err.message);
      console.error('Error details:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during user lookup',
        details: err.message
      });
    }

    if (!users || !Array.isArray(users) || users.length === 0) {
      console.error('❌ User not found in database');
      console.error('Searched for email:', username);
      console.error('Users result:', users);
      return res.status(400).json({ 
        success: false, 
        error: 'User not found. Please register first.' 
      });
    }

    // ✅ FIX: Safely handle user object
    const user = users[0];
    
    if (!user || typeof user !== 'object') {
      console.error('❌ Invalid user object received:', user);
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid user data from database' 
      });
    }
    
    // ✅ FIX: Debug user object structure
    console.log('✅ User found:');
    try {
      console.log('📊 DEBUG - Full user object:', JSON.stringify(user, null, 2));
      console.log('📊 DEBUG - User keys:', Object.keys(user));
    } catch (e) {
      console.error('❌ Error logging user object:', e.message);
    }
    
    // ✅ FIX: Handle different ID field names
    const userId = user.id || user.ID || user.user_id || user.USER_ID;
    
    if (!userId) {
      console.error('❌ Could not extract user ID from user object:', user);
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid user data structure - no ID found' 
      });
    }
    
    console.log('✅ User details:');
    console.log('  - ID:', userId);
    console.log('  - Email:', user.email || user.EMAIL);
    console.log('  - Name:', user.name || user.NAME);
    console.log('  - Phone:', user.phone || user.PHONE);

    /* =====================================================
       SINGLE ORDER → TOMORROW MORNING DELIVERY
    ===================================================== */
    if (subscription_type === 'single_order') {
      console.log('📦 Step 5: Processing single order...');
      console.log('Address:', address || 'Not provided');
      console.log('Building:', building_name || 'Not provided');
      console.log('Flat:', flat_number || 'Not provided');
      console.log('Landmark:', landmark || 'Not provided');
      console.log('Coordinates:', latitude && longitude ? `${latitude}, ${longitude}` : 'Not provided');

      try {
        // ✅ FIX: Use extracted userId instead of user.id
        const [result] = await db.execute(
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
            userId,  // ✅ FIXED: Use extracted userId
            user.email || user.EMAIL,
            payment.amount / 100,
            address || '',
            latitude || null,
            longitude || null,
            razorpay_payment_id
          ]
        );

        console.log('✅ ORDER INSERTED INTO DB');
        console.log('Order ID:', result.insertId);

      } catch (err) {
        console.error('❌ Database error during order insertion:', err.message);
        console.error('SQL Error:', err.sqlMessage || err.sql);
        console.error('Error Code:', err.code);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to save order to database',
          details: err.sqlMessage || err.message
        });
      }

      // 🔔 Telegram notification (non-blocking)
      try {
        const fullAddress = [
          flat_number && `Flat: ${flat_number}`,
          building_name && `Building: ${building_name}`,
          address,
          landmark && `Landmark: ${landmark}`
        ].filter(Boolean).join('\n');

        await sendTelegramAlert(
          `🥛 <b>NEW SINGLE ORDER</b>\n\n` +
          `👤 ${user.name || user.NAME || 'N/A'}\n` +
          `📞 ${user.phone || user.PHONE || 'N/A'}\n` +
          `📧 ${user.email || user.EMAIL}\n` +
          `💰 ₹${payment.amount / 100}\n` +
          `🚚 Delivery: Tomorrow Morning\n\n` +
          `📍 <b>Address:</b>\n${fullAddress || 'Not provided'}\n\n` +
          `💳 Payment ID: ${razorpay_payment_id}`
        );
        console.log('✅ Telegram notification sent');
      } catch (e) {
        console.error('⚠️ Telegram notification failed (non-critical):', e.message);
      }

      console.log('🎉 Single order processed successfully');

      return res.json({
        success: true,
        message: 'Single order placed successfully',
        order_details: {
          user_email: user.email || user.EMAIL,
          amount: payment.amount / 100,
          delivery: 'Tomorrow Morning',
          payment_id: razorpay_payment_id
        }
      });
    }

    /* =====================================================
       SUBSCRIPTION ORDERS (if you add this later)
    ===================================================== */
    console.error('❌ Invalid subscription_type:', subscription_type);
    return res.status(400).json({ 
      success: false, 
      error: `Invalid subscription type: ${subscription_type}` 
    });

  } catch (err) {
    console.error('❌ VERIFY PAYMENT UNEXPECTED ERROR:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during payment verification',
      message: err.message
    });
  }
});

/* =========================================================
   PAYMENT STATUS CHECK → /api/verify-payment/status/:payment_id
========================================================= */
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  console.log('🔍 Checking payment status for:', req.params.payment_id);

  try {
    const [rows] = await db.execute(
      'SELECT * FROM orders WHERE payment_id = ?',
      [req.params.payment_id]
    );

    if (!rows || rows.length === 0) {
      console.log('❌ No order found for payment ID:', req.params.payment_id);
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    console.log('✅ Order found:', rows[0].id || rows[0].ID);
    res.json({ 
      success: true, 
      order: rows[0] 
    });

  } catch (err) {
    console.error('❌ Database error:', err.message);
    res.status(500).json({ 
      success: false,
      error: 'Database error' 
    });
  }
});

/* =========================================================
   HEALTH CHECK
========================================================= */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    razorpay_configured: !!(credentials.key_id && credentials.key_secret)
  });
});

module.exports = router;
