/**
 * Fix for "Subscription save failed: Payment verification failed"
 * This script provides comprehensive fixes for subscription payment verification issues
 */

const crypto = require('crypto');
const { createRazorpayInstance } = require('./razorpay-config');

// Enhanced payment verification with detailed error handling
async function verifyPaymentEnhanced(paymentId, orderId, signature, expectedAmount) {
  try {
    // Validate input parameters
    if (!paymentId || !orderId || !signature) {
      throw new Error('Missing required parameters: paymentId, orderId, or signature');
    }

    // Verify signature
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'NPoKf4KIga8XfW369c9ygs37')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid payment signature');
    }

    // Initialize Razorpay
    const razorpay = createRazorpayInstance();
    
    // Fetch payment details
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Enhanced status handling - accept both authorized and captured
    const validStatuses = ['authorized', 'captured'];
    if (!validStatuses.includes(payment.status)) {
      throw new Error(`Payment status: ${payment.status}`);
    }

    // Verify amount
    if (payment.amount !== expectedAmount) {
      throw new Error(`Amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
    }

    return {
      success: true,
      payment: payment,
      message: 'Payment verified successfully'
    };
  } catch (error) {
    console.error('Payment verification error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fix subscription creation with proper validation
async function createSubscriptionWithVerification(subscriptionData) {
  try {
    const {
      username,
      subscription_type,
      duration,
      amount,
      address,
      building_name,
      flat_number,
      payment_id,
      latitude,
      longitude
    } = subscriptionData;

    // Enhanced validation
    const validationErrors = [];
    
    if (!username) validationErrors.push('Username is required');
    if (!subscription_type) validationErrors.push('Subscription type is required');
    if (!duration) validationErrors.push('Duration is required');
    if (!amount || amount <= 0) validationErrors.push('Valid amount is required');
    if (!address) validationErrors.push('Address is required');
    if (!building_name) validationErrors.push('Building name is required');
    if (!flat_number) validationErrors.push('Flat number is required');
    if (!payment_id) validationErrors.push('Payment ID is required');

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Validation failed',
        details: validationErrors
      };
    }

    // Validate payment ID format
    if (!payment_id.startsWith('pay_')) {
      return {
        success: false,
        error: 'Invalid payment ID format'
      };
    }

    // Verify payment
    const verificationResult = await verifyPaymentEnhanced(
      payment_id,
      `order_${Date.now()}`,
      subscriptionData.signature,
      Math.round(parseFloat(amount) * 100)
    );

    if (!verificationResult.success) {
      return {
        success: false,
        error: 'Payment verification failed',
        details: verificationResult.error
      };
    }

    // Check for existing active subscriptions
    const [existingSubscriptions] = await require('./db').execute(
      'SELECT id FROM subscriptions WHERE username = ? AND subscription_type = ? AND status = "active"',
      [username, subscription_type]
    );

    if (existingSubscriptions.length > 0) {
      return {
        success: false,
        error: 'Active subscription already exists for this type'
      };
    }

    // Create subscription
    const [result] = await require('./db').execute(
      `INSERT INTO subscriptions 
       (username, subscription_type, duration, amount, address, building_name, flat_number, payment_id, latitude, longitude, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        username,
        subscription_type,
        duration,
        parseFloat(amount),
        address,
        building_name,
        flat_number,
        payment_id,
        parseFloat(latitude),
        parseFloat(longitude)
      ]
    );

    return {
      success: true,
      subscription_id: result.insertId,
      message: 'Subscription created successfully'
    };

  } catch (error) {
    console.error('Subscription creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fix database schema issues
async function fixDatabaseSchema() {
  try {
    const db = require('./db');
    
    // Fix subscription status enum
    await db.execute(`
      ALTER TABLE subscriptions 
      MODIFY COLUMN status ENUM('active', 'inactive', 'paused', 'expired', 'cancelled') 
      DEFAULT 'active'
    `);

    // Add proper indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_username ON subscriptions(username)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_payment ON subscriptions(payment_id)
    `);

    // Add payment verification fields
    await db.execute(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_error TEXT
    `);

    console.log('Database schema fixes applied successfully');
    return true;
  } catch (error) {
    console.error('Database fix error:', error);
    return false;
  }
}

// Export fixes
module.exports = {
  verifyPaymentEnhanced,
  createSubscriptionWithVerification,
  fixDatabaseSchema
};

// Run fixes if called directly
if (require.main === module) {
  fixDatabaseSchema().then(() => {
    console.log('Subscription payment verification fixes applied');
    process.exit(0);
  });
}
