const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// Import centralized Razorpay configuration
const { getCredentials } = require('../razorpay-config');

// Get credentials from centralized config
const credentials = getCredentials();

// Initialize Razorpay with centralized credentials
const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

// POST /api/create-order - Create order before payment
router.post('/create-order', async (req, res) => {
  try {
    const { amount, subscription_type, duration, username } = req.body;

    if (!amount || !subscription_type || !duration || !username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order fields',
        missing_fields: Object.keys(req.body).filter(key => !req.body[key])
      });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        subscription_type,
        duration,
        username
      }
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

// POST /api/verify-payment - Enhanced verification
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
      latitude,
      longitude,
      username
    } = req.body;

    // Enhanced validation with detailed error messages
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
        missing_fields: missingFields,
        received_data: req.body
      });
    }

    // Verify signature with enhanced error handling
    try {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', credentials.key_secret)
        .update(body.toString())
        .digest('hex');

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature',
          debug: {
            expected: expectedSignature,
            received: razorpay_signature
          }
        });
      }
    } catch (signatureError) {
      return res.status(400).json({
        success: false,
        message: 'Signature verification failed',
        error: signatureError.message
      });
    }

    // Verify payment with Razorpay
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      // Accept both authorized and captured statuses
      const validStatuses = ['authorized', 'captured'];
      if (!validStatuses.includes(payment.status)) {
        return res.status(400).json({
          success: false,
          message: 'Payment not completed',
          payment_status: payment.status,
          valid_statuses: validStatuses
        });
      }

      // Verify order ID matches
      if (payment.order_id !== razorpay_order_id) {
        return res.status(400).json({
          success: false,
          message: 'Order ID mismatch',
          expected_order: razorpay_order_id,
          payment_order: payment.order_id
        });
      }
    } catch (paymentError) {
      console.error('Razorpay payment fetch error:', paymentError);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment with Razorpay',
        error: paymentError.message
      });
    }

    // Calculate amount based on subscription type and duration
    const amount = calculateAmount(subscription_type, duration);

    // Check for existing active subscriptions in users table
    try {
      const [existingUser] = await db.execute(
        'SELECT id FROM users WHERE username = ? AND subscription_type = ? AND subscription_status = "active"',
        [username, subscription_type]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Active subscription already exists for this type'
        });
      }
    } catch (checkError) {
      console.error('Subscription check error:', checkError);
    }

    // Check if user exists
    const [userRows] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (userRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Calculate end date based on duration
    const startDate = new Date();
    let daysToAdd = 0;
    if (duration === '6days') daysToAdd = 6;
    else if (duration === '15days') daysToAdd = 15;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToAdd);

    // Save subscription to users table
    const subscriptionData = {
      username,
      subscription_type,
      subscription_duration: duration,
      subscription_status: 'active',
      subscription_start_date: startDate,
      subscription_end_date: endDate,
      subscription_amount: amount,
      subscription_address: address,
      subscription_building_name: building_name,
      subscription_flat_number: flat_number,
      subscription_payment_id: razorpay_payment_id,
      subscription_created_at: new Date(),
      subscription_updated_at: new Date(),
      paused_at: null,
      resumed_at: null,
      total_paused_days: 0,
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0
    };

    try {
      await db.execute(
        `UPDATE users SET
          subscription_type = ?,
          subscription_duration = ?,
          subscription_status = ?,
          subscription_start_date = ?,
          subscription_end_date = ?,
          subscription_amount = ?,
          subscription_address = ?,
          subscription_building_name = ?,
          subscription_flat_number = ?,
          subscription_payment_id = ?,
          subscription_created_at = ?,
          subscription_updated_at = ?,
          paused_at = ?,
          resumed_at = ?,
          total_paused_days = ?
         WHERE username = ?`,
        [
          subscriptionData.subscription_type,
          subscriptionData.subscription_duration,
          subscriptionData.subscription_status,
          subscriptionData.subscription_start_date,
          subscriptionData.subscription_end_date,
          subscriptionData.subscription_amount,
          subscriptionData.subscription_address,
          subscriptionData.subscription_building_name,
          subscriptionData.subscription_flat_number,
          subscriptionData.subscription_payment_id,
          subscriptionData.subscription_created_at,
          subscriptionData.subscription_updated_at,
          subscriptionData.paused_at,
          subscriptionData.resumed_at,
          subscriptionData.total_paused_days,
          username
        ]
      );

      res.json({
        success: true,
        message: 'Payment verified and subscription saved successfully',
        subscription: subscriptionData
      });

    } catch (dbError) {
      console.error('Database save error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save subscription',
        error: dbError.message
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/verify-payment/status/:payment_id
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    
    const [users] = await db.execute(
      `SELECT 
        subscription_type, subscription_duration, subscription_status, 
        subscription_start_date, subscription_end_date, subscription_amount,
        subscription_address, subscription_building_name, subscription_flat_number,
        subscription_payment_id, subscription_created_at, subscription_updated_at,
        paused_at, resumed_at, total_paused_days
       FROM users WHERE subscription_payment_id = ?`,
      [payment_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const subscription = {
      type: users[0].subscription_type,
      duration: users[0].subscription_duration,
      status: users[0].subscription_status,
      start_date: users[0].subscription_start_date,
      end_date: users[0].subscription_end_date,
      amount: users[0].subscription_amount,
      address: users[0].subscription_address,
      building_name: users[0].subscription_building_name,
      flat_number: users[0].subscription_flat_number,
      payment_id: users[0].subscription_payment_id,
      created_at: users[0].subscription_created_at,
      updated_at: users[0].subscription_updated_at,
      paused_at: users[0].paused_at,
      resumed_at: users[0].resumed_at,
      total_paused_days: users[0].total_paused_days
    };

    res.json({
      success: true,
      subscription: subscription
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

// Helper function to calculate amount
function calculateAmount(type, duration) {
  const prices = {
    '500ml': { '6days': 300, '15days': 750 },
    '1000ml': { '6days': 540, '15days': 1350 }
  };
  return prices[type]?.[duration] || 0;
}

module.exports = router;
