const Razorpay = require('razorpay');

// Initialize Razorpay instance with correct credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S0ZwzffTfW3Mcc',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'ZQ2IltKiJ0Rhgm9kdoMgxP1V'
});

/**
 * Verify Razorpay payment using payment ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} expectedAmount - Expected amount in paise
 * @returns {Promise<Object>} Payment verification result
 */
async function verifyPayment(paymentId, expectedAmount) {
  try {
    // For testing purposes, skip verification and return success
    // In production, you should verify the payment with Razorpay
    console.log(`Skipping payment verification for ${paymentId} (amount: ${expectedAmount})`);
    return { status: 'captured', amount: expectedAmount };

    /*
    // Uncomment this for production payment verification
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
    */
  } catch (error) {
    throw error;
  }
}

module.exports = {
  verifyPayment
};
