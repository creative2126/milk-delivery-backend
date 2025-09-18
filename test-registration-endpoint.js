const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test data
const testUsers = [
  {
    username: 'testuser1',
    password: 'password123',
    email: 'testuser1@example.com',
    phone: '9876543210',
    name: 'Test User 1'
  },
  {
    username: 'testuser2',
    password: 'securepass123',
    email: 'testuser2@example.com',
    phone: '9123456789',
    name: 'Test User 2'
  }
];

async function testRegistration() {
  console.log('🧪 Testing registration endpoint...\n');

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    
    try {
      console.log(`Test ${i + 1}: Registering ${user.username}...`);
      
      const response = await axios.post(`${BASE_URL}/api/users`, user);
      
      console.log(`✅ Success:`, {
        userId: response.data.userId,
        username: response.data.data.username,
        message: response.data.message
      });
      
    } catch (error) {
      console.log(`❌ Failed:`, {
        status: error.response?.status,
        error: error.response?.data?.error,
        code: error.response?.data?.code,
        details: error.response?.data?.details
      });
    }
    
    console.log(''); // Empty line for readability
  }

  // Test duplicate registration
  console.log('🔄 Testing duplicate registration...');
  try {
    await axios.post(`${BASE_URL}/api/users`, testUsers[0]);
    console.log('❌ Should have failed for duplicate');
  } catch (error) {
    console.log(`✅ Correctly rejected duplicate:`, {
      error: error.response?.data?.error,
      code: error.response?.data?.code
    });
  }

  // Test invalid data
  console.log('\n📝 Testing invalid data...');
  const invalidTests = [
    { username: '', password: 'pass123', email: 'test@example.com' }, // Missing username
    { username: 'test', password: '', email: 'test@example.com' }, // Missing password
    { username: 'test', password: 'pass123', email: '' }, // Missing email
    { username: 'test', password: 'pass123', email: 'invalid-email' }, // Invalid email
    { username: 'test user', password: 'pass123', email: 'test@example.com' }, // Invalid username format
    { username: 'test', password: '123', email: 'test@example.com' }, // Weak password
  ];

  for (let i = 0; i < invalidTests.length; i++) {
    const invalidData = invalidTests[i];
    
    try {
      await axios.post(`${BASE_URL}/api/users`, invalidData);
      console.log(`❌ Test ${i + 1} should have failed`);
    } catch (error) {
      console.log(`✅ Test ${i + 1} correctly rejected:`, {
        error: error.response?.data?.error,
        code: error.response?.data?.code
      });
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testRegistration()
    .then(() => console.log('\n🎉 Registration tests completed!'))
    .catch(error => console.error('Test suite failed:', error));
}

module.exports = testRegistration;
