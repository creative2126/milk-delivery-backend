const axios = require('axios');
const bcrypt = require('bcryptjs');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Test data
const testUsers = [
  { username: 'testuser1', email: 'test1@example.com', password: 'password123', phone: '1234567890' },
  { username: 'testuser2', email: 'test2@example.com', password: 'password123', phone: '0987654321' }
];

const testSubscriptions = [
  { username: 'testuser1', subscription_type: 'daily_milk', duration: '30 days', amount: 1500 },
  { username: 'testuser2', subscription_type: 'weekly_milk', duration: '7 days', amount: 350 }
];

class AdminTestSuite {
  constructor() {
    this.token = null;
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive admin page testing...\n');
    
    try {
      await this.testAdminAuthentication();
      await this.testUserManagement();
      await this.testSubscriptionManagement();
      await this.testOrderManagement();
      await this.testDashboardAnalytics();
      await this.testPerformance();
      await this.testSecurity();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.generateReport();
    }
  }

  async testAdminAuthentication() {
    console.log('🔐 Testing admin authentication...');
    
    try {
      // Test valid admin login
      const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      });
      
      this.token = loginResponse.data.token;
      this.addResult('Admin Login', 'PASS', 'Valid credentials accepted');
      
      // Test invalid credentials
      try {
        await axios.post(`${BASE_URL}/api/admin/login`, {
          username: 'invalid',
          password: 'invalid'
        });
        this.addResult('Invalid Login', 'FAIL', 'Should reject invalid credentials');
      } catch (error) {
        this.addResult('Invalid Login', 'PASS', 'Correctly rejected invalid credentials');
      }
      
    } catch (error) {
      this.addResult('Admin Authentication', 'FAIL', error.message);
    }
  }

  async testUserManagement() {
    console.log('👥 Testing user management...');
    
    try {
      // Create test users
      for (const user of testUsers) {
        await axios.post(`${BASE_URL}/api/register`, {
          username: user.username,
          email: user.email,
          password: user.password,
          phone: user.phone,
          address: 'Test Address'
        });
      }
      
      // Fetch all users
      const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      const users = usersResponse.data.users || [];
      this.addResult('User Fetch', 'PASS', `Fetched ${users.length} users`);
      
      // Test user details
      const testUser = users.find(u => u.username === 'testuser1');
      if (testUser && testUser.email === 'test1@example.com') {
        this.addResult('User Details', 'PASS', 'User details correctly fetched');
      }
      
    } catch (error) {
      this.addResult('User Management', 'FAIL', error.message);
    }
  }

async function testFetchAllSubscriptions(adminToken) {
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Username': ADMIN_USERNAME
      }
    });
    
    if (response.data.subscriptions && Array.isArray(response.data.subscriptions)) {
      logTest('Fetch All Subscriptions - Admin', true);
      console.log(chalk.blue(`   Found ${response.data.subscriptions.length} subscriptions`));
      return response.data.subscriptions;
    } else {
      logTest('Fetch All Subscriptions - Admin', false, 'Invalid response format');
      return [];
    }
  } catch (error) {
    logTest('Fetch All Subscriptions - Admin', false, error);
    return [];
  }
}

// Test 4: Fetch User Profile
async function testFetchUserProfile(username) {
  try {
    const response = await axios.get(`${BASE_URL}/api/profile`, {
      params: { username: username }
    });
    
    if (response.data.id && response.data.email) {
      logTest(`Fetch User Profile - ${username}`, true);
      return response.data;
    } else {
      logTest(`Fetch User Profile - ${username}`, false, 'Invalid response format');
      return null;
