/**
 * Comprehensive test suite for payment verification fixes
 * Tests the enhanced payment verification system
 */

const axios = require('axios');
const crypto = require('crypto');

// Test configuration - use environment variables for flexibility
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_KEY = process.env.RAZORPAY_KEY || 'rzp_test_amonk8Ow16WyvE';
const TEST_SECRET = process.env.RAZORPAY_SECRET || 'NPoKf4KIga8XfW369c9ygs37';

// Test data
const testSubscription = {
  subscription_type: '500ml',
  duration: '6days',
  amount: 300,
  address: 'Test Address',
  building_name: 'Test Building',
  flat_number: '101',
  latitude: 19.0760,
  longitude: 72.8777,
  username: 'test_user_' + Date.now() // Unique username for each test run
};

// Generate test signature
function generateTestSignature(orderId, paymentId) {
  const body = orderId + "|" + paymentId;
  return crypto
    .createHmac('sha256', TEST_SECRET)
    .update(body.toString())
    .digest('hex');
}

// Test 1: Create order
async function testCreateOrder() {
  console.log('🧪 Testing create order...');
  try {
    const response = await axios.post(`${BASE_URL}/api/create-order`, {
      amount: testSubscription.amount,
      subscription_type: testSubscription.subscription_type,
      duration: testSubscription.duration,
      username: testSubscription.username
    });
    
    console.log('✅ Create order successful:', response.data);
    return response.data.order_id;
  } catch (error) {
    console.error('❌ Create order failed:', error.response?.data || error.message);
    return null;
  }
}

// Test 2: Verify payment
async function testVerifyPayment(orderId) {
  console.log('🧪 Testing verify payment...');
  const paymentId = 'pay_test_' + Date.now();
  const signature = generateTestSignature(orderId, paymentId);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/verify-payment`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      ...testSubscription
    });
    
    console.log('✅ Verify payment successful:', response.data);
    return response.data.subscription_id;
  } catch (error) {
    console.error('❌ Verify payment failed:', error.response?.data || error.message);
    return null;
  }
}

// Test 3: Missing fields validation
async function testMissingFields() {
  console.log('🧪 Testing missing fields validation...');
  try {
    const response = await axios.post(`${BASE_URL}/api/verify-payment`, {
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_test',
      // Missing signature
      subscription_type: '500ml',
      duration: '6days',
      username: 'test_user'
    });
    
    console.error('❌ Should have failed with missing fields');
  } catch (error) {
    if (error.response?.data?.missing_fields) {
      console.log('✅ Missing fields validation working:', error.response.data);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Test 4: Invalid signature
async function testInvalidSignature() {
  console.log('🧪 Testing invalid signature...');
  try {
    const response = await axios.post(`${BASE_URL}/api/verify-payment`, {
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_test',
      razorpay_signature: 'invalid_signature',
      subscription_type: '500ml',
      duration: '6days',
      address: 'Test Address',
      building_name: 'Test Building',
      flat_number: '101',
      latitude: 19.0760,
      longitude: 72.8777,
      username: 'test_user'
    });
    
    console.error('❌ Should have failed with invalid signature');
  } catch (error) {
    if (error.response?.data?.message === 'Invalid payment signature') {
      console.log('✅ Invalid signature validation working:', error.response.data);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Test 5: Check payment status
async function testPaymentStatus(subscriptionId) {
  console.log('🧪 Testing payment status check...');
  try {
    const response = await axios.get(`${BASE_URL}/api/verify-payment/status/pay_test_${subscriptionId}`);
    console.log('✅ Payment status check successful:', response.data);
  } catch (error) {
    console.error('❌ Payment status check failed:', error.response?.data || error.message);
  }
}

// Test 6: Create order with missing fields
async function testCreateOrderMissingFields() {
  console.log('🧪 Testing create order with missing fields...');
  try {
    const response = await axios.post(`${BASE_URL}/api/create-order`, {
      amount: 300,
      // Missing subscription_type, duration, username
    });
    
    console.error('❌ Should have failed with missing fields');
  } catch (error) {
    if (error.response?.data?.missing_fields) {
      console.log('✅ Create order missing fields validation working:', error.response.data);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive payment verification tests...\n');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const orderId = await testCreateOrder();
  if (orderId) {
    const subscriptionId = await testVerifyPayment(orderId);
    if (subscriptionId) {
      await testPaymentStatus(subscriptionId);
    }
  }
  
  await testMissingFields();
  await testInvalidSignature();
  await testCreateOrderMissingFields();
  
  console.log('\n✅ All tests completed!');
}

// Export for use in other files
module.exports = {
  testCreateOrder,
  testVerifyPayment,
  testMissingFields,
  testInvalidSignature,
  testPaymentStatus,
  testCreateOrderMissingFields,
  runAllTests
};

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
