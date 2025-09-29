const Razorpay = require('razorpay');
const { getCredentials } = require('./razorpay-config');

// Test Razorpay credentials
async function testRazorpayCredentials() {
  try {
    const credentials = getCredentials();
    console.log('Testing Razorpay credentials...');
    console.log('Key ID:', credentials.key_id);

    const razorpay = new Razorpay({
      key_id: credentials.key_id,
      key_secret: credentials.key_secret
    });

    // Try to create a test order
    const testOrder = {
      amount: 100, // 1 rupee in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      notes: {
        test: 'true'
      }
    };

    console.log('Creating test order...');
    const order = await razorpay.orders.create(testOrder);
    console.log('✅ Razorpay credentials are valid!');
    console.log('Test order created:', order.id);

    return true;
  } catch (error) {
    console.error('❌ Razorpay credentials are invalid!');
    console.error('Error:', error.message);
    return false;
  }
}

// Run the test
testRazorpayCredentials().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
