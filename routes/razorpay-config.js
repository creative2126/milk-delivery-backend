const express = require('express');
const router = express.Router();
const { getFrontendCredentials } = require('../razorpay-config');

// Endpoint to get Razorpay key for frontend
router.get('/razorpay-config', (req, res) => {
  try {
    const config = getFrontendCredentials();
    res.json({
      success: true,
      key_id: config.key_id,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error serving Razorpay config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load Razorpay configuration'
    });
  }
});

module.exports = router;
