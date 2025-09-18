// Centralized Razorpay configuration
// This file ensures consistent credentials across the application

const Razorpay = require('razorpay');

// Test credentials from RAZORPAY-CONFIG.md
const TEST_CREDENTIALS = {
  key_id: 'rzp_test_RF8OERr5RnBors',
  key_secret: 'B704L3EETDXCaK6zCEXAqutu'
};

// Get credentials from environment variables or use test credentials
const getCredentials = () => {
  return {
    key_id: process.env.RAZORPAY_KEY_ID || TEST_CREDENTIALS.key_id,
    key_secret: process.env.RAZORPAY_KEY_SECRET || TEST_CREDENTIALS.key_secret
  };
};

// Create and export configured Razorpay instance
const createRazorpayInstance = () => {
  const credentials = getCredentials();
  return new Razorpay({
    key_id: credentials.key_id,
    key_secret: credentials.key_secret
  });
};

// Export credentials for frontend use
const getFrontendCredentials = () => {
  const credentials = getCredentials();
  return {
    key_id: credentials.key_id
  };
};

module.exports = {
  createRazorpayInstance,
  getCredentials,
  getFrontendCredentials,
  TEST_CREDENTIALS
};
