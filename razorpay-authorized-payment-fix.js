/**
 * Fix for Razorpay legacy verification flow failing on authorized-only payments
 * This handles both authorized and captured payment states correctly
 */

const crypto = require('crypto');
const { createRazorpayInstance } = require('./razorpay-config');

const razorpay = createRazorpayInstance();

/**
 * Enhanced payment verification that handles both authorized and captured states
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} orderId - Razorpay order ID
 * @param {string} signature - Razorpay signature
 * @param {number} expectedAmount - Expected amount in paise
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Payment verification result
 */
async function verifyPaymentWithAuthorizedSupport(paymentId, orderId, signature, expectedAmount, options = {}) {
  try {
    // Validate input parameters
    if (!paymentId || !orderId || !signature) {
      throw new Error('Missing required parameters: paymentId, orderId, or signature');
    }

    // Verify signature first
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'NPoKf4KIga8XfW369c9ygs37')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid payment signature');
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Enhanced status handling - accept both authorized and captured
    const validStatuses = ['authorized', 'captured'];
    if (!validStatuses.includes(payment.status)) {
      throw new Error(`Invalid payment status: ${payment.status}`);
    }

    // For authorized payments, we can optionally auto-capture if needed
    if (payment.status === 'authorized' && options.autoCapture !== false) {
      try {
        const captureResult = await razorpay.payments.capture(paymentId, expectedAmount);
        payment.status = 'captured';
        payment.captured = true;
      } catch (captureError) {
        console.warn('Auto-capture failed, but authorized payment is valid:', captureError.message);
        // Continue with authorized state if capture fails
      }
    }

    // Verify amount matches
    if (payment.amount !== expectedAmount) {
      throw new Error(`Amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
    }

    return {
      success: true,
      payment: payment,
      status: payment.status,
      message: payment.status === 'captured' 
        ? 'Payment verified and captured successfully' 
        : 'Payment authorized successfully',
      authorized: payment.status === 'authorized',
      captured: payment.status === 'captured'
    };
  } catch (error) {
    console.error('Enhanced payment verification error:', error.message);
    return {
      success: false,
      error: error.message,
      payment: null
    };
  }
}

/**
 * Legacy verification flow compatibility wrapper
 * This maintains backward compatibility while fixing the authorized payment issue
 */
async function legacyVerificationFlowFixed(paymentId, orderId, signature, expectedAmount) {
  try {
    const result = await verifyPaymentWithAuthorizedSupport(paymentId, orderId, signature, expectedAmount, {
      autoCapture: false // Don't auto-capture for legacy compatibility
    });
    
    if (result.success) {
      // Legacy flow expects captured status, but we'll accept authorized too
      return {
        success: true,
        payment: result.payment,
        // Return success for both authorized and captured states
        verified: true
      };
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if a payment is valid regardless of capture state
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment status check result
 */
async function checkPaymentStatus(paymentId) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    const validStatuses = ['authorized', 'captured'];
    const isValid = validStatuses.includes(payment.status);
    
    return {
      success: true,
      payment: payment,
      isValid: isValid,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      captured: payment.captured || false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Manual capture for authorized payments
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to capture in paise
 * @returns {Promise<Object>} Capture result
 */
async function captureAuthorizedPayment(paymentId, amount) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (payment.status !== 'authorized') {
      throw new Error(`Payment is not in authorized state: ${payment.status}`);
    }

    const captureResult = await razorpay.payments.capture(paymentId, amount);
    
    return {
      success: true,
      captured: captureResult,
      message: 'Payment captured successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enhanced subscription creation with authorized payment support
 */
async function createSubscriptionWithAuthorizedSupport(subscriptionData) {
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
      longitude,
      signature,
      order_id
    } = subscriptionData;

    // Validate payment
    const verificationResult = await verifyPaymentWithAuthorizedSupport(
      payment_id,
      order_id,
      signature,
      Math.round(parseFloat(amount) * 100)
    );

    if (!verificationResult.success) {
      return {
        success: false,
        error: 'Payment verification failed',
        details: verificationResult.error
      };
    }

    // Create subscription
    const db = require('./db');
    const [result] = await db.execute(
      `INSERT INTO subscriptions 
       (username, subscription_type, duration, amount, address, building_name, flat_number, payment_id, latitude, longitude, status, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
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
        parseFloat(longitude),
        verificationResult.status // 'authorized' or 'captured'
      ]
    );

    return {
      success: true,
      subscription_id: result.insertId,
      payment_status: verificationResult.status,
      message: 'Subscription created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  verifyPaymentWithAuthorizedSupport,
  legacyVerificationFlowFixed,
  checkPaymentStatus,
  captureAuthorizedPayment,
  createSubscriptionWithAuthorizedSupport
};
