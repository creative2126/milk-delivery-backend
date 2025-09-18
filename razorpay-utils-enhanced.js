const crypto = require('crypto');
const { createRazorpayInstance } = require('./razorpay-config');

// Initialize Razorpay instance with centralized config
const razorpay = createRazorpayInstance();

/**
 * Enhanced payment verification with signature validation
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} orderId - Razorpay order ID
 * @param {string} signature - Razorpay signature
 * @param {number} expectedAmount - Expected amount in paise
 * @returns {Promise<Object>} Payment verification result
 */
async function verifyPayment(paymentId, orderId, signature, expectedAmount) {
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

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Enhanced status handling - accept both authorized and captured
    const validStatuses = ['authorized', 'captured'];
    if (!validStatuses.includes(payment.status)) {
      throw new Error(`Payment status: ${payment.status}`);
    }

    // Verify amount matches
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
    throw error;
  }
}

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in paise
 * @param {string} currency - Currency code (default: INR)
 * @param {string} receipt - Receipt ID
 * @returns {Promise<Object>} Order details
 */
async function createOrder(amount, currency = 'INR', receipt = null) {
  try {
    const options = {
      amount: amount,
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Order creation error:', error.message);
    throw error;
  }
}

/**
 * Verify payment without order (for backward compatibility)
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} expectedAmount - Expected amount in paise
 * @returns {Promise<Object>} Payment verification result
 */
async function verifyPaymentLegacy(paymentId, expectedAmount) {
  try {
    if (!paymentId || !paymentId.startsWith('pay_')) {
      throw new Error('Invalid payment ID format');
    }

    const payment = await razorpay.payments.fetch(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check payment status
    if (payment.status !== 'captured') {
      throw new Error(`Payment status: ${payment.status}`);
    }

    // Check amount matches expected amount
    if (payment.amount !== expectedAmount) {
      throw new Error(`Payment amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
    }

    return {
      success: true,
      payment: payment,
      message: 'Payment verified successfully'
    };
  } catch (error) {
    console.error('Legacy payment verification error:', error.message);
    throw error;
  }
}

module.exports = {
  verifyPayment,
  verifyPaymentLegacy,
  createOrder
};
