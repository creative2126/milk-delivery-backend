/**
 * Test script for authorized payment fix
 * Tests both authorized and captured payment states
 */

const { verifyPayment } = require('./razorpay-utils-enhanced');

async function testAuthorizedPayment() {
  try {
    // Replace with valid test data
    const paymentId = 'pay_test_authorized';
    const orderId = 'order_test_123';
    const signature = 'test_signature';
    const amount = 10000; // in paise

    const result = await verifyPayment(paymentId, orderId, signature, amount);
    console.log('Authorized payment verification result:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function testCapturedPayment() {
  try {
    // Replace with valid test data
    const paymentId = 'pay_test_captured';
    const orderId = 'order_test_456';
    const signature = 'test_signature';
    const amount = 20000; // in paise

    const result = await verifyPayment(paymentId, orderId, signature, amount);
    console.log('Captured payment verification result:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function runTests() {
  await testAuthorizedPayment();
  await testCapturedPayment();
}

runTests();
