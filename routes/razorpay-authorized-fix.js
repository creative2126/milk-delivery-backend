/**
 * Express routes for handling authorized payment verification
 * Fixes the legacy verification flow issue
 */

const express = require('express');
const router = express.Router();
const {
  verifyPaymentWithAuthorizedSupport,
  checkPaymentStatus,
  captureAuthorizedPayment,
  createSubscriptionWithAuthorizedSupport
} = require('../razorpay-authorized-payment-fix');

/**
 * POST /api/verify-payment-authorized
 * Enhanced payment verification endpoint that handles authorized payments
 */
router.post('/verify-payment-authorized', async (req, res) => {
  try {
    const { paymentId, orderId, signature, amount, autoCapture = false } = req.body;

    if (!paymentId || !orderId || !signature || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    const result = await verifyPaymentWithAuthorizedSupport(
      paymentId,
      orderId,
      signature,
      amount,
      { autoCapture }
    );

    res.json(result);
  } catch (error) {
    console.error('Payment verification endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/check-payment-status
 * Check payment status regardless of capture state
 */
router.post('/check-payment-status', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    const result = await checkPaymentStatus(paymentId);
    res.json(result);
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/capture-authorized
 * Manually capture an authorized payment
 */
router.post('/capture-authorized', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID and amount are required'
      });
    }

    const result = await captureAuthorizedPayment(paymentId, amount);
    res.json(result);
  } catch (error) {
    console.error('Capture payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/create-subscription-authorized
 * Create subscription with authorized payment support
 */
router.post('/create-subscription-authorized', async (req, res) => {
  try {
    const subscriptionData = req.body;
    
    const result = await createSubscriptionWithAuthorizedSupport(subscriptionData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
