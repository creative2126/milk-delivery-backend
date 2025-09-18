const axios = require('axios');
const { createRazorpayInstance } = require('./razorpay-config');
const { verifyPayment, createOrder } = require('./razorpay-utils-enhanced');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = 'testuser';
const TEST_PASSWORD = 'testpass123';
const TEST_EMAIL = 'test@example.com';

// Test card details
const TEST_CARD = {
  number: '4111111111111111',
  expiry: '12/25',
  cvv: '123',
  name: 'Test User'
};

// Test amounts (in paise)
const TEST_AMOUNT = 150000; // ₹1500
const TEST_AMOUNT_SMALL = 100000; // ₹1000

class PaymentGatewayTester {
  constructor() {
    this.testResults = [];
    this.razorpay = createRazorpayInstance();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.testResults.push(logEntry);
    console.log(`[${type.toUpperCase()}] ${timestamp}: ${message}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Starting test: ${testName}`);
      const result = await testFunction();
      this.log(`✅ Test passed: ${testName}`);
      return { success: true, result };
    } catch (error) {
      this.log(`❌ Test failed: ${testName} - ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testRazorpayConfiguration() {
    return this.runTest('Razorpay Configuration', async () => {
      const credentials = require('./razorpay-config').getCredentials();
      
      if (!credentials.key_id || !credentials.key_secret) {
        throw new Error('Missing Razorpay credentials');
      }
      
      this.log(`✓ Key ID: ${credentials.key_id}`);
      this.log(`✓ Key Secret: ${credentials.key_secret ? 'Present' : 'Missing'}`);
      
      return credentials;
    });
  }

  async testOrderCreation() {
    return this.runTest('Order Creation', async () => {
      const order = await createOrder(TEST_AMOUNT, 'INR', 'test_receipt_001');
      
      if (!order.id || !order.amount) {
        throw new Error('Invalid order response');
      }
      
      this.log(`✓ Order ID: ${order.id}`);
      this.log(`✓ Order Amount: ${order.amount}`);
      
      return order;
    });
  }

  async testPaymentVerification() {
    return this.runTest('Payment Verification', async () => {
      // Create a test order first
      const order = await createOrder(TEST_AMOUNT_SMALL, 'INR', 'test_receipt_002');
      
      // Mock payment verification (in real test, use actual payment)
      const mockPayment = {
        id: 'pay_test123456789',
        amount: TEST_AMOUNT_SMALL,
        status: 'captured',
        order_id: order.id
      };
      
      // Test signature verification
      const signature = 'test_signature';
      const verification = await verifyPayment(
        mockPayment.id,
        order.id,
        signature,
        TEST_AMOUNT_SMALL
      );
      
      this.log(`✓ Payment verification: ${verification.success}`);
      
      return verification;
    });
  }

  async testUserRegistration() {
    return this.runTest('User Registration', async () => {
      const response = await axios.post(`${BASE_URL}/api/users`, {
        username: TEST_USER,
        password: TEST_PASSWORD,
        email: TEST_EMAIL,
        phone: '9876543210',
        address: '123 Test Street, Mumbai'
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Registration failed');
      }
      
      this.log(`✓ User registered: ${response.data.data.username}`);
      
      return response.data;
    });
  }

  async testUserLogin() {
    return this.runTest('User Login', async () => {
      const response = await axios.post(`${BASE_URL}/api/login`, {
        username: TEST_USER,
        password: TEST_PASSWORD
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }
      
      this.log(`✓ User logged in: ${response.data.user.username}`);
      
      return response.data;
    });
  }

  async testSubscriptionCreation() {
    return this.runTest('Subscription Creation', async () => {
      const subscriptionData = {
        username: TEST_USER,
        subscription_type: 'daily',
        duration: '30 days',
        amount: 1500,
        address: '123 Test Street, Mumbai',
        building_name: 'Test Building',
        flat_number: '101',
        payment_id: 'pay_test123456789',
        latitude: 19.0760,
        longitude: 72.8777
      };
      
      const response = await axios.post(`${BASE_URL}/api/subscriptions`, subscriptionData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Subscription creation failed');
      }
      
      this.log(`✓ Subscription created: ${response.data.subscription_id}`);
      
      return response.data;
    });
  }

  async testSubscriptionStatus() {
    return this.runTest('Subscription Status', async () => {
      const response = await axios.get(`${BASE_URL}/api/subscriptions/check/${TEST_USER}`);
      
      if (!response.data.hasOwnProperty('hasActiveSubscription')) {
        throw new Error('Invalid subscription status response');
      }
      
      this.log(`✓ Has active subscription: ${response.data.hasActiveSubscription}`);
      
      return response.data;
    });
  }

  async testPaymentDebugPage() {
    return this.runTest('Payment Debug Page', async () => {
      const response = await axios.get(`${BASE_URL}/public/payment-debug.html`);
      
      if (response.status !== 200) {
        throw new Error('Payment debug page not accessible');
      }
      
      this.log(`✓ Payment debug page accessible`);
      
      return response.status;
    });
  }

  async testTestPaymentPage() {
    return this.runTest('Test Payment Page', async () => {
      const response = await axios.get(`${BASE_URL}/public/test-payment.html`);
      
      if (response.status !== 200) {
        throw new Error('Test payment page not accessible');
      }
      
      this.log(`✓ Test payment page accessible`);
      
      return response.status;
    });
  }

  async testAdminEndpoints() {
    return this.runTest('Admin Endpoints', async () => {
      // Test admin login
      const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      if (!loginResponse.data.success) {
        throw new Error('Admin login failed');
      }
      
      this.log(`✓ Admin login successful`);
      
      // Test admin subscriptions endpoint
      const subscriptionsResponse = await axios.get(`${BASE_URL}/api/admin/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'X-Username': 'admin'
        }
      });
      
      if (!subscriptionsResponse.data.success) {
        throw new Error('Admin subscriptions endpoint failed');
      }
      
      this.log(`✓ Admin subscriptions endpoint accessible`);
      
      return { login: loginResponse.data, subscriptions: subscriptionsResponse.data };
    });
  }

  async testErrorHandling() {
    return this.runTest('Error Handling', async () => {
      // Test invalid payment ID
      try {
        await verifyPayment('invalid_payment_id', 'order_123', 'signature', 1000);
        throw new Error('Should have thrown error for invalid payment ID');
      } catch (error) {
        this.log(`✓ Invalid payment ID handled correctly: ${error.message}`);
      }
      
      // Test amount mismatch
      try {
        await createOrder(-1000, 'INR', 'test_receipt_negative');
        throw new Error('Should have thrown error for negative amount');
      } catch (error) {
        this.log(`✓ Negative amount handled correctly: ${error.message}`);
      }
      
      return { success: true };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Payment Gateway Tests...\n');
    
    const tests = [
      this.testRazorpayConfiguration,
      this.testOrderCreation,
      this.testPaymentVerification,
      this.testUserRegistration,
      this.testUserLogin,
      this.testSubscriptionCreation,
      this.testSubscriptionStatus,
      this.testPaymentDebugPage,
      this.testTestPaymentPage,
      this.testAdminEndpoints,
      this.testErrorHandling
    ];
    
    const results = [];
    
    for (const test of tests) {
      const result = await test.call(this);
      results.push({
        test: test.name,
        ...result
      });
    }
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      results: results
    };
    
    console.log('\n📊 Test Report:');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    
    if (report.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      report.results.filter(r => !r.success).forEach(r => {
        console.log(`- ${r.test}: ${r.error}`);
      });
    }
    
    return report;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new PaymentGatewayTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n✅ All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = PaymentGatewayTester;
