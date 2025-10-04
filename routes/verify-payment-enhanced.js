const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

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
      amount: Math.round(parseFloat(amount) * 100),
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
      latitude,
      longitude,
      username
    } = req.body;

    // Validation
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

    // Verify signature
    try {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', credentials.key_secret)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
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
      const validStatuses = ['authorized', 'captured'];
      
      if (!validStatuses.includes(payment.status)) {
        return res.status(400).json({
          success: false,
          message: 'Payment not completed',
          payment_status: payment.status
        });
      }

      if (payment.order_id !== razorpay_order_id) {
        return res.status(400).json({
          success: false,
          message: 'Order ID mismatch'
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

    const amount = calculateAmount(subscription_type, duration);

    // FIX: Check for existing active subscriptions - CORRECTED
    let existingUser = [];
    try {
      const result = await db.execute(
        'SELECT id FROM users WHERE username = ? AND subscription_type = ? AND subscription_status = "active"',
        [username, subscription_type]
      );
      
      // CRITICAL FIX: Safely extract rows
      existingUser = Array.isArray(result) && result.length > 0 ? result[0] : [];
      
      console.log('Subscription check result:', {
        hasResult: !!result,
        isArray: Array.isArray(existingUser),
        length: existingUser.length
      });

    } catch (checkError) {
      console.error('Subscription check error:', checkError);
      // Continue with empty array - don't block payment
      existingUser = [];
    }

    // FIX: Safe length check
    if (Array.isArray(existingUser) && existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Active subscription already exists for this type'
      });
    }

    // Check if user exists
    const userResult = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    const userRows = Array.isArray(userResult) && userResult.length > 0 ? userResult[0] : [];
    
    if (!Array.isArray(userRows) || userRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Calculate dates
    const startDate = new Date();
    let daysToAdd = 0;
    if (duration === '6days') daysToAdd = 7; // 6 + 1 free
    else if (duration === '15days') daysToAdd = 17; // 15 + 2 free
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToAdd);

    // Save subscription
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
          subscription_created_at = NOW(),
          subscription_updated_at = NOW(),
          paused_at = NULL,
          resumed_at = NULL,
          total_paused_days = 0
         WHERE username = ?`,
        [
          subscription_type,
          duration,
          'active',
          startDate,
          endDate,
          amount,
          address || '',
          building_name || '',
          flat_number || '',
          razorpay_payment_id,
          username
        ]
      );

      console.log('Subscription saved successfully for user:', username);

      res.json({
        success: true,
        message: 'Payment verified and subscription saved successfully',
        subscription_id: razorpay_payment_id,
        start_date: startDate,
        end_date: endDate
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

router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    
    const result = await db.execute(
      `SELECT 
        subscription_type, subscription_duration, subscription_status, 
        subscription_start_date, subscription_end_date, subscription_amount,
        subscription_address, subscription_building_name, subscription_flat_number,
        subscription_payment_id, subscription_created_at, subscription_updated_at,
        paused_at, resumed_at, total_paused_days
       FROM users WHERE subscription_payment_id = ?`,
      [payment_id]
    );

    const users = Array.isArray(result) && result.length > 0 ? result[0] : [];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      subscription: {
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
      }
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

function calculateAmount(type, duration) {
  const prices = {
    '500ml': { '6days': 300, '15days': 750 },
    '1000ml': { '6days': 570, '15days': 1425 }
  };
  return prices[type]?.[duration] || 0;
}

module.exports = router;
