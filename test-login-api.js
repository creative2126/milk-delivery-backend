const bcrypt = require('bcryptjs');
const db = require('./db');

async function testLoginAPI() {
  try {
    console.log('🔍 Testing login API endpoint...');
    
    // Test user credentials
    const username = 'test@example.com';
    const password = 'test123';
    
    console.log(`\n🔍 Testing login for: ${username}`);
    
    // Find user
    const [users] = await db.execute(
      'SELECT id, username, password, email, name, phone, address, created_at FROM users WHERE username = ? OR email = ? OR phone = ?',
      [username, username, username]
    );

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users[0];
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email
    });
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('✅ Password verification:', isPasswordValid ? 'Valid' : 'Invalid');
    
    if (isPasswordValid) {
      // Test login response format
      const loginResponse = {
        success: true,
        token: 'demo-token-' + Date.now(),
        user: {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          email: user.email,
          phone: user.phone,
          address: user.address
        }
      };
      
      console.log('✅ Login response format:', JSON.stringify(loginResponse, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testLoginAPI();
