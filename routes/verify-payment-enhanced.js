const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');

// Import centralized Razorpay configuration
const { getCredentials } = require('../razorpay-config');
const credentials = getCredentials();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: credentials.key_id,
  key_secret: credentials.key_secret
});

// Helper to format date for MySQL
const formatDateForMySQL = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

// Helper to calculate subscription amount
// TESTING MODE: All prices set to ₹1
function calculateAmount(type, duration) {
  const prices = {
    '500ml': { '6days': 1, '15days': 1 },
    '1000ml': { '6days': 1, '15days': 1 }
  };
  return prices[type]?.[duration] || 1; // Default to 1 for testing
}

// ----------------- CREATE ORDER -----------------
router.post('/create-order', async (req, res) => {
  try {
    const { amount, subscription_type, duration, username } = req.body;

    console.log('Creating order with data:', { amount, subscription_type, duration, username });

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

    // TESTING MODE: Use the amount sent from frontend (should be ₹1)
    const testAmount = parseFloat(amount);
    console.log('TESTING MODE: Using amount from request:', testAmount);

    const options = {
      amount: Math.round(testAmount * 100), // paise (₹1 = 100 paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { subscription_type, duration, username }
    };

    const order = await razorpay.orders.create(options);
    console.log('Order created successfully:', order.id, 'Amount:', order.amount, 'paise');

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: credentials.key_id
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
});

// ----------------- VERIFY PAYMENT -----------------
router.post('/verify-payment', async (req, res) => {
  const startTime = Date.now();
  console.log('=== PAYMENT VERIFICATION STARTED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

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

    console.log('Address with coordinates:', address);

    // Validate required fields
    const missingFields = [];
    if (!razorpay_order_id) missingFields.push('razorpay_order_id');
    if (!razorpay_payment_id) missingFields.push('razorpay_payment_id');
    if (!razorpay_signature) missingFields.push('razorpay_signature');
    if (!subscription_type) missingFields.push('subscription_type');
    if (!duration) missingFields.push('duration');
    if (!username) missingFields.push('username');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required payment verification fields', 
        missing_fields: missingFields 
      });
    }

    // Verify Razorpay signature
    console.log('Verifying payment signature...');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', credentials.key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    console.log('Signature verified successfully');

    // Fetch payment details from Razorpay
    console.log('Fetching payment details from Razorpay...');
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    console.log('Payment details:', {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      order_id: payment.order_id
    });

    if (!['authorized', 'captured'].includes(payment.status)) {
      console.error('Invalid payment status:', payment.status);
      return res.status(400).json({ 
        success: false, 
        message: 'Payment not completed', 
        payment_status: payment.status 
      });
    }

    if (payment.order_id !== razorpay_order_id) {
      console.error('Order ID mismatch');
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID mismatch' 
      });
    }

    console.log('Payment verified with Razorpay successfully');

    // TESTING MODE: Calculate amount using test prices (₹1)
    const amount = calculateAmount(subscription_type, duration);
    console.log('TESTING MODE - Calculated amount:', amount);

    const startDate = new Date();
    const daysToAdd = duration === '6days' ? 7 : 17;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToAdd);

    console.log('Subscription dates:', {
      start: formatDateForMySQL(startDate),
      end: formatDateForMySQL(endDate),
      days: daysToAdd
    });

    // Check user existence by email (case-insensitive)
    console.log('Checking if user exists with email:', username);
    const [rows] = await db.execute(
      `SELECT id, username, email, name FROM users WHERE LOWER(email) = LOWER(?)`,
      [username]
    );

    if (rows.length === 0) {
      console.error('User not found in database');
      return res.status(400).json({ 
        success: false, 
        message: 'User not found. Please register first.', 
        searched_for: username 
      });
    }

    const foundUser = rows[0];
    console.log('Found user:', { 
      id: foundUser.id, 
      email: foundUser.email, 
      name: foundUser.name 
    });

    // Use the pre-formatted address from frontend (already includes coordinates)
    // If address is not provided, build it from parts
    const fullAddress = address || 
      [building_name, flat_number, landmark].filter(Boolean).join(', ');

    console.log('Full address to save:', fullAddress);
    console.log('Address includes coordinates:', fullAddress.includes('Lat:') && fullAddress.includes('Lng:'));

    // Update subscription in database
    console.log('Updating subscription in database...');
    const updateStart = Date.now();

    const updateResult = await db.execute(
      `UPDATE users SET
        subscription_type = ?,
        subscription_duration = ?,
        subscription_status = ?,
        subscription_start_date = ?,
        subscription_end_date = ?,
        subscription_amount = ?,
        subscription_total_amount = ?,
        subscription_address = ?,
        subscription_building_name = ?,
        subscription_flat_number = ?,
        subscription_payment_id = ?,
        subscription_created_at = NOW(),
        subscription_updated_at = NOW(),
        updated_at = NOW()
      WHERE LOWER(email) = LOWER(?)`,
      [
        subscription_type,
        duration,
        'active',
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

    console.log('UPDATE completed in', Date.now() - updateStart, 'ms');
    console.log('Update result:', {
      affectedRows: updateResult.affectedRows,
      changedRows: updateResult.changedRows,
      warningCount: updateResult.warningCount
    });

    if (updateResult.affectedRows === 0) {
      throw new Error('UPDATE affected 0 rows - user not found after verification');
    }

    console.log('Subscription saved successfully for user:', username);
    console.log('=== PAYMENT VERIFICATION COMPLETED SUCCESSFULLY ===');
    console.log('Total processing time:', Date.now() - startTime, 'ms');

    res.json({
      success: true,
      message: 'Payment verified and subscription created successfully',
      subscription_id: razorpay_payment_id,
      subscription: {
        type: subscription_type,
        duration: duration,
        amount: amount,
        start_date: formatDateForMySQL(startDate),
        end_date: formatDateForMySQL(endDate),
        status: 'active'
      }
    });

  } catch (error) {
    console.error('=== PAYMENT VERIFICATION FAILED ===');
    console.error('Error at:', Date.now() - startTime, 'ms');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });

    res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ----------------- CHECK PAYMENT STATUS -----------------
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;
    
    console.log('Checking payment status for:', payment_id);

    const [rows] = await db.execute(
      `SELECT subscription_type, subscription_duration, subscription_status, 
              subscription_start_date, subscription_end_date, subscription_amount,
              subscription_address, subscription_building_name, subscription_flat_number,
              subscription_payment_id, subscription_created_at, subscription_updated_at
       FROM users WHERE subscription_payment_id = ?`,
      [payment_id]
    );

    if (rows.length === 0) {
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
    console.error('Payment status check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check payment status', 
      error: error.message 
    });
  }
});

module.exports = router;
