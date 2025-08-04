const db = require('./db');

async function testProfileAPI() {
  try {
    console.log('🔍 Testing profile API endpoints...');
    
    // Test database connection
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // Test user lookup
    const testUsername = 'test@example.com';
    console.log(`\n🔍 Testing user lookup for: ${testUsername}`);
    
    const [users] = await db.execute(
      'SELECT id, username, name, email, phone, address, created_at FROM users WHERE username = ? OR email = ?',
      [testUsername, testUsername]
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
      email: user.email,
      phone: user.phone,
      address: user.address
    });
    
    // Test address parsing
    let addressData = {
      street: '',
      city: '',
      state: '',
      zip: ''
    };
    
    if (user.address) {
      const addressParts = user.address.split(',').map(part => part.trim());
      addressData.street = addressParts[0] || '';
      addressData.city = addressParts[1] || '';
      addressData.state = addressParts[2] || '';
      addressData.zip = addressParts[3] || '';
    }
    
    console.log('✅ Address parsed:', addressData);
    
    // Test API response format
    const apiResponse = {
      id: user.id,
      name: user.name || user.username,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      street: addressData.street,
      city: addressData.city,
      state: addressData.state,
      zip: addressData.zip,
      created_at: user.created_at
    };
    
    console.log('✅ API response format:', JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testProfileAPI();
