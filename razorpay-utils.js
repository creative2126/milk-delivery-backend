const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YGdTdLUZyBiD8P',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_key'
});

/**
 * Verify Razorpay payment using payment ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} expectedAmount - Expected amount in paise
 * @returns {Promise<Object>} Payment verification result
 */
async function verifyPayment(paymentId, expectedAmount) {
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

    return payment;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  verifyPayment
};
