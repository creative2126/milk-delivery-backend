// Manual payment testing script for interactive testing
const readline = require('readline');
const axios = require('axios');
const { createRazorpayInstance } = require('./razorpay-config');
const { createOrder, verifyPayment } = require('./razorpay-utils-enhanced');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'http://localhost:3001';

// Test data
const testUser = {
  username: 'testuser',
  password: 'testpass123',
  email: 'test@example.com'
};

// Razorpay test card details
const testCards = {
  success: {
    number: '4111111111111111',
    expiry: '12/25',
    cvv: '123',
    name: 'Test User'
  },
  failure: {
    number: '4000000000000002',
    expiry: '12/25',
    cvv: '123',
    name: 'Test User'
  }
};

class ManualPaymentTester {
  constructor() {
    this.currentUser = null;
    this.currentOrder = null;
    this.currentSubscription = null;
  }

  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  async displayMenu() {
    console.log('\n🥛 Milk Delivery Payment Gateway Tester');
    console.log('=====================================');
    console.log('1. Test Razorpay Configuration');
    console.log('2. Create Test Order');
    console.log('3. Test Payment Verification');
    console.log('4. Register Test User');
    console.log('5. Login Test User');
    console.log('6. Create Subscription');
    console.log('7. Test Payment with Test Card');
    console.log('8. Check Subscription Status');
    console.log('9. Test Admin Login');
    console.log('10. Run All Tests');
    console.log('0. Exit');
    console.log('=====================================\n');
  }

  async testRazorpayConfig() {
    console.log('\n🔧 Testing Razorpay Configuration...');
    try {
      const { getCredentials } = require('./razorpay-config');
      const credentials = getCredentials();
      
      console.log('✅ Razorpay Configuration:');
      console.log(`   Key ID: ${credentials.key_id}`);
      console.log(`   Key Secret: ${credentials.key_secret ? 'Present' : 'Missing'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Configuration test failed:', error.message);
      return false;
    }
  }

  async createTestOrder() {
    console.log('\n💳 Creating Test Order...');
    try {
      const amount = await this.prompt('Enter amount (in INR): ') || '1500';
      const order = await createOrder(parseInt(amount) * 100, 'INR', 'manual_test');
      
      console.log('✅ Order Created:');
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Amount: ₹${order.amount / 100}`);
      console.log(`   Currency: ${order.currency}`);
      
      this.currentOrder = order;
      return order;
    } catch (error) {
      console.error('❌ Order creation failed:', error.message);
      return null;
    }
  }

  async testPaymentVerification() {
    console.log('\n🔍 Testing Payment Verification...');
    try {
      if (!this.currentOrder) {
        console.log('⚠️  No order found. Creating one first...');
        await this.createTestOrder();
      }

      const paymentId = await this.prompt('Enter payment ID (or use mock): ') || 'pay_test123456789';
      const signature = await this.prompt('Enter signature: ') || 'test_signature';
      
      const verification = await verifyPayment(
        paymentId,
        this.currentOrder.id,
        signature,
        this.currentOrder.amount
      );
      
      console.log('✅ Payment Verification:');
      console.log(`   Success: ${verification.success}`);
      console.log(`   Message: ${verification.message}`);
      
      return verification;
    } catch (error) {
      console.error('❌ Payment verification failed:', error.message);
      return null;
    }
  }

  async registerTestUser() {
    console.log('\n👤 Registering Test User...');
    try {
      const username = await this.prompt('Enter username: ') || testUser.username;
      const password = await this.prompt('Enter password: ') || testUser.password;
      const email = await this.prompt('Enter email: ') || testUser.email;

      const response = await axios.post(`${BASE_URL}/api/users`, {
        username,
        password,
        email,
        phone: '9876543210',
        address: '123 Test Street, Mumbai'
      });

      console.log('✅ User Registered:');
      console.log(`   Username: ${response.data.data.username}`);
      console.log(`   User ID: ${response.data.data.userId}`);
      
      this.currentUser = response.data.data;
      return response.data;
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async loginTestUser() {
    console.log('\n🔐 Logging in Test User...');
    try {
      const username = await this.prompt('Enter username: ') || testUser.username;
      const password = await this.prompt('Enter password: ') || testUser.password;

      const response = await axios.post(`${BASE_URL}/api/login`, {
        username,
        password
      });

      console.log('✅ User Logged In:');
      console.log(`   Username: ${response.data.user.username}`);
      console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
      
      this.currentUser = response.data.user;
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async createSubscription() {
    console.log('\n📋 Creating Subscription...');
    try {
      if (!this.currentUser) {
        console.log('⚠️  No user logged in. Logging in first...');
        await this.loginTestUser();
      }

      const subscriptionData = {
        username: this.currentUser.username,
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

      console.log('✅ Subscription Created:');
      console.log(`   Subscription ID: ${response.data.subscription_id}`);
      
      this.currentSubscription = response.data;
      return response.data;
    } catch (error) {
      console.error('❌ Subscription creation failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async testPaymentWithCard() {
    console.log('\n💳 Testing Payment with Test Card...');
    console.log('Test Card Details:');
    console.log('   Number: 4111 1111 1111 1111');
    console.log('   Expiry: 12/25');
    console.log('   CVV: 123');
    console.log('   Name: Test User');
    
    try {
      // Create order first
      const order = await this.createTestOrder();
      if (!order) return null;

      console.log('\n🔗 Payment URL:');
      console.log(`   ${BASE_URL}/public/subscription.html`);
      console.log('\n📱 Instructions:');
      console.log('1. Open the URL above in browser');
      console.log('2. Select subscription plan');
      console.log('3. Fill in address details');
      console.log('4. Use the test card details above');
      console.log('5. Complete payment flow');
      
      return { orderId: order.id, instructions: 'Follow steps above' };
    } catch (error) {
      console.error('❌ Payment test failed:', error.message);
      return null;
    }
  }

  async checkSubscriptionStatus() {
    console.log('\n📊 Checking Subscription Status...');
    try {
      if (!this.currentUser) {
        console.log('⚠️  No user logged in. Using test user...');
        const username = await this.prompt('Enter username: ') || testUser.username;
        
        const response = await axios.get(`${BASE_URL}/api/subscriptions/check/${username}`);
        
        console.log('✅ Subscription Status:');
        console.log(`   Has Active Subscription: ${response.data.hasActiveSubscription}`);
        if (response.data.activeSubscriptions && response.data.activeSubscriptions.length > 0) {
          console.log(`   Active Subscriptions: ${response.data.activeSubscriptions.length}`);
          response.data.activeSubscriptions.forEach(sub => {
            console.log(`   - ${sub.subscription_type}: ${sub.remaining_days} days remaining`);
          });
        }
        
        return response.data;
      }
    } catch (error) {
      console.error('❌ Status check failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async testAdminLogin() {
    console.log('\n🔐 Testing Admin Login...');
    try {
      const username = await this.prompt('Enter admin username: ') || 'admin';
      const password = await this.prompt('Enter admin password: ') || 'admin123';

      const response = await axios.post(`${BASE_URL}/api/admin/login`, {
        username,
        password
      });

      console.log('✅ Admin Login Successful:');
      console.log(`   Username: ${response.data.user.username}`);
      console.log(`   Role: ${response.data.user.role}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Admin login failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async runAllTests() {
    console.log('\n🚀 Running All Tests...\n');
    
    const tests = [
      this.testRazorpayConfig,
      this.createTestOrder,
      this.testPaymentVerification,
      this.registerTestUser,
      this.loginTestUser,
      this.createSubscription,
      this.checkSubscriptionStatus,
      this.testAdminLogin
    ];
    
    const results = [];
    
    for (const test of tests) {
      const result = await test.call(this);
      results.push({
        test: test.name,
        success: !!result,
        result: result
      });
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 Test Results:');
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    
    if (results.filter(r => !r.success).length > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`- ${r.test}`);
      });
    }
    
    return results;
  }

  async start() {
    console.log('🥛 Milk Delivery Payment Gateway Manual Tester');
    console.log('=============================================\n');
    
    while (true) {
      await this.displayMenu();
      
      const choice = await this.prompt('Enter your choice: ');
      
      switch (choice) {
        case '1':
          await this.testRazorpayConfig();
          break;
        case '2':
          await this.createTestOrder();
          break;
        case '3':
          await this.testPaymentVerification();
          break;
        case '4':
          await this.registerTestUser();
          break;
        case '5':
          await this.loginTestUser();
          break;
        case '6':
          await this.createSubscription();
          break;
        case '7':
          await this.testPaymentWithCard();
          break;
        case '8':
          await this.checkSubscriptionStatus();
          break;
        case '9':
          await this.testAdminLogin();
          break;
        case '10':
          await this.runAllTests();
          break;
        case '0':
          console.log('👋 Goodbye!');
          rl.close();
          process.exit(0);
          break;
        default:
          console.log('❌ Invalid choice. Please try again.');
      }
      
      await this.prompt('\nPress Enter to continue...');
    }
  }
}

// Start the manual tester
if (require.main === module) {
  const tester = new ManualPaymentTester();
  tester.start().catch(error => {
    console.error('❌ Tester failed:', error);
    rl.close();
    process.exit(1);
  });
}

module.exports = ManualPaymentTester;
