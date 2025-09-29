// Debug script to check deployed environment
const Razorpay = require('razorpay');
const { getCredentials } = require('./razorpay-config');
require('dotenv').config();

console.log('=== DEPLOYMENT DEBUG ===');
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'undefined');

// Check environment variables
console.log('\n=== ENVIRONMENT VARIABLES ===');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'NOT SET');
console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
console.log('DB_PASS:', process.env.DB_PASS ? 'SET' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME ? 'SET' : 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');

// Test Razorpay credentials
console.log('\n=== RAZORPAY TEST ===');
try {
  const credentials = getCredentials();
  console.log('Credentials loaded from config');
  console.log('Key ID:', credentials.key_id);

  const razorpay = new Razorpay({
    key_id: credentials.key_id,
    key_secret: credentials.key_secret
  });

  console.log('Razorpay instance created successfully');
} catch (error) {
  console.error('Razorpay initialization failed:', error.message);
}

// Test database connection
console.log('\n=== DATABASE TEST ===');
try {
  const db = require('./db');
  console.log('Database module loaded');

  // Test connection
  db.testConnection().then(result => {
    console.log('Database connection test:', result ? 'SUCCESS' : 'FAILED');
    process.exit(0);
  }).catch(error => {
    console.error('Database connection error:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('Database module load failed:', error.message);
  process.exit(1);
}
