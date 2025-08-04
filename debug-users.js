const db = require('./db');
const bcrypt = require('bcryptjs');

async function debugUsers() {
  try {
    console.log('🔍 Checking database connection...');
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');

    console.log('\n🔍 Checking users table...');
    const [users] = await db.execute('SELECT id, username, email, name FROM users');
    console.log('Current users:', users);

    if (users.length === 0) {
      console.log('\n📝 Creating test users...');
      
      // Create test user 1
      const hashedPassword1 = await bcrypt.hash('test123', 10);
      await db.execute(
        'INSERT INTO users (username, password, name, phone, email) VALUES (?, ?, ?, ?, ?)',
        ['test@example.com', hashedPassword1, 'Test User', '1234567890', 'test@example.com']
      );
      
      // Create test user 2
      const hashedPassword2 = await bcrypt.hash('password123', 10);
      await db.execute(
        'INSERT INTO users (username, password, name, phone, email) VALUES (?, ?, ?, ?, ?)',
        ['demo@demo.com', hashedPassword2, 'Demo User', '9876543210', 'demo@demo.com']
      );
      
      console.log('✅ Test users created:');
      console.log('   - test@example.com / test123');
      console.log('   - demo@demo.com / password123');
    }

    // Verify all users
    const [allUsers] = await db.execute('SELECT id, username, email, name FROM users');
    console.log('\n📋 All users in database:', allUsers);

    // Test password verification
    console.log('\n🔐 Testing password verification...');
    const [testUser] = await db.execute('SELECT * FROM users WHERE username = ?', ['test@example.com']);
    if (testUser.length > 0) {
      const isValid = await bcrypt.compare('test123', testUser[0].password);
      console.log('Password verification for test@example.com:', isValid ? '✅ Valid' : '❌ Invalid');
    }

  } catch (error) {
    console.error('❌ Database error:', error);
    
    // Check if users table exists
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('❌ Users table does not exist. Please run the database setup scripts.');
    }
  }
  
  process.exit(0);
}

debugUsers();
