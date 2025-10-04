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

// Helper function to format dates for MySQL
const formatDateForMySQL = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Helper function to calculate amount based on subscription type and duration
function calculateAmount(type, duration) {
  const prices = {
    '500ml': { '6days': 300, '15days': 750 },
    '1000ml': { '6days': 570, '15days': 1425 }
  };
  return prices[type]?.[duration] || 0;
}

// POST /api/create-order - Create Razorpay order before payment
router.post('/create-order', async (req, res) => {
  try {
    const { amount, subscription_type, duration, username } = req.body;

    console.log('Creating order with data:', { amount, subscription_type, duration, username });

    // Validation
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

    // Create Razorpay order
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

    console.log('Order created successfully:', order.id);

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

// POST /api/verify-payment - Verify payment and create subscription
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
      username // this will now hold userEmail for backend verification
    } = req.body;

    // Step 1: Validate required fields
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

    // Step 2: Verify Razorpay signature
    console.log('Verifying payment signature...');
    try {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', credentials.key_secret)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('Signature verification failed');
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
      console.log('Signature verified successfully');
    } catch (signatureError) {
      console.error('Signature verification error:', signatureError);
      return res.status(400).json({
        success: false,
        message: 'Signature verification failed',
        error: signatureError.message
      });
    }

    // Step 3: Verify payment with Razorpay API
    console.log('Fetching payment details from Razorpay...');
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      console.log('Payment details:', {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        order_id: payment.order_id
      });

      const validStatuses = ['authorized', 'captured'];
      if (!validStatuses.includes(payment.status)) {
        console.error('Invalid payment status:', payment.status);
        return res.status(400).json({
          success: false,
          message: 'Payment not completed',
          payment_status: payment.status,
          valid_statuses: validStatuses
        });
      }

      if (payment.order_id !== razorpay_order_id) {
        console.error('Order ID mismatch');
        return res.status(400).json({
          success: false,
          message: 'Order ID mismatch',
          expected: razorpay_order_id,
          received: payment.order_id
        });
      }

      console.log('Payment verified with Razorpay successfully');
    } catch (paymentError) {
      console.error('Razorpay payment fetch error:', paymentError);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment with Razorpay',
        error: paymentError.message
      });
    }

    // Step 4: Calculate subscription details
    const amount = calculateAmount(subscription_type, duration);
    console.log('Calculated amount:', amount);

    const startDate = new Date();
    const daysToAdd = duration === '6days' ? 7 : 17; // 6+1 free or 15+2 free
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToAdd);

    console.log('Subscription dates:', {
      start: formatDateForMySQL(startDate),
      end: formatDateForMySQL(endDate),
      days: daysToAdd
    });

    // Step 5: Check if user exists using email (case-insensitive)
    console.log('Checking if user exists using email:', username);

    let userExists = false;
    let foundUserId = null;
    let foundUserData = null;

    try {
      const userResult = await db.execute(
        `SELECT id, username, email, name 
         FROM users 
         WHERE LOWER(email) = LOWER(?)`, 
        [username]
      );

      const userRows = Array.isArray(userResult) && userResult.length > 0 ? userResult[0] : [];
      userExists = Array.isArray(userRows) && userRows.length > 0;

      if (userExists) {
        foundUserId = userRows[0].id;
        foundUserData = {
          id: userRows[0].id,
          username: userRows[0].username,
          email: userRows[0].email,
          name: userRows[0].name
        };
      }

      console.log('User check result:', {
        searchedFor: username,
        exists: userExists,
        foundUser: foundUserData
      });

      if (!userExists) {
        console.error('User not found in database');
        return res.status(400).json({
          success: false,
          message: 'User not found. Please register first.',
          searched_for: username,
          hint: 'Check if the email matches your registration'
        });
      }
    } catch (userCheckError) {
      console.error('User check error:', userCheckError);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify user',
        error: userCheckError.message
      });
    }

    // Step 6: Build full address
    const fullAddress = [building_name, flat_number, landmark]
      .filter(Boolean)
      .join(', ') || address || '';

    console.log('Full address:', fullAddress);

    // Step 7: Update user subscription in database using email only
    console.log('Updating subscription in database...');
    console.log('Will update user with ID:', foundUserId);
    const updateStart = Date.now();

    try {
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
        throw new Error('UPDATE affected 0 rows - this should not happen after user check passed');
      }

      console.log('Subscription saved successfully for user:', username);

    } catch (dbError) {
      console.error('Database update error:', dbError);
      console.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno,
        sqlState: dbError.sqlState,
        sqlMessage: dbError.sqlMessage
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to save subscription to database',
        error: dbError.message,
        sql_error: dbError.sqlMessage
      });
    }

    // Step 8: Success response
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

// GET /api/verify-payment/status/:payment_id - Check payment status
router.get('/verify-payment/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;

    console.log('Checking payment status for:', payment_id);

    const result = await db.execute(
      `SELECT 
        subscription_type, 
        subscription_duration, 
        subscription_status, 
        subscription_start_date, 
        subscription_end_date, 
        subscription_amount,
        subscription_address, 
        subscription_building_name, 
        subscription_flat_number,
        subscription_payment_id, 
        subscription_created_at, 
        subscription_updated_at
       FROM users 
       WHERE subscription_payment_id = ?`,
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
        updated_at: users[0].subscription_updated_at
      }
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
