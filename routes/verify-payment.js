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

// POST /api/verify-payment
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
    if (!address) missingFields.push('address');
    if (!building_name) missingFields.push('building_name');
    if (!flat_number) missingFields.push('flat_number');
    if (!username) missingFields.push('username');

    if (missingFields.length > 0) {
      console.error('Missing fields in payment verification:', {
        missingFields,
        receivedBody: req.body
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
        missingFields,
        received: Object.keys(req.body)
      });
    }

    // Verify signature using centralized credentials
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
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

    // Fetch payment from Razorpay
    let payment;
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
      if (payment.status !== 'captured') {
        return res.status(400).json({
          success: false,
          message: 'Payment not captured'
        });
      }
    } catch (err) {
      console.error('Razorpay payment fetch error:', err);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment with Razorpay'
      });
    }

    // Calculate amount
    const amount = calculateAmount(subscription_type, duration);

    // Save subscription
    const subscriptionData = {
      username: username || 'guest',
      razorpay_order_id,
      razorpay_payment_id,
      subscription_type,
      duration,
      amount,
      address,
      building_name,
      flat_number,
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };

    const [result] = await db.execute(
      `INSERT INTO subscriptions 
        (username, subscription_type, duration, amount, address, building_name, flat_number, latitude, longitude, payment_id, status, created_at, updated_at, order_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscriptionData.username,
        subscriptionData.subscription_type,
        subscriptionData.duration,
        subscriptionData.amount,
        subscriptionData.address,
        subscriptionData.building_name,
        subscriptionData.flat_number,
        subscriptionData.latitude,
        subscriptionData.longitude,
        subscriptionData.razorpay_payment_id,
        subscriptionData.status,
        subscriptionData.created_at,
        subscriptionData.updated_at,
        subscriptionData.razorpay_order_id
      ]
    );

    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription_id: result.insertId,
      subscription: subscriptionData
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// GET /api/verify-payment/status/:payment_id
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    
    const [subscriptions] = await db.execute(
      'SELECT * FROM subscriptions WHERE payment_id = ?',
      [payment_id]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      subscription: subscriptions[0]
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
    '1000ml': { '6days': 540, '15days': 1350 }
  };
  return prices[type]?.[duration] || 0;
}

module.exports = router;
