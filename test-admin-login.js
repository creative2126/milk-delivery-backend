const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    
    // Test with correct credentials
    const response = await axios.post('http://localhost:3001/api/admin/login', {
      username: 'admin@milkdelivery.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful:', response.data);
    
  } catch (error) {
    console.error('❌ Login failed:', error.response ? error.response.data : error.message);
  }
}

// Also test with username instead of email
async function testAdminLoginWithUsername() {
  try {
    console.log('Testing admin login with username...');
    
    const response = await axios.post('http://localhost:3001/api/admin/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful with username:', response.data);
    
  } catch (error) {
    console.error('❌ Login failed with username:', error.response ? error.response.data : error.message);
  }
}

testAdminLogin();
testAdminLoginWithUsername();
