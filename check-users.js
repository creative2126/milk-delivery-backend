const db = require('./backend/db');

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    const [users] = await db.execute('SELECT id, username, password FROM users');
    
    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    console.log('Users found:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Password: ${user.password.substring(0, 20)}...`);
    });
    
    // Test bcrypt verification
    const bcrypt = require('bcryptjs');
    const [testUser] = await db.execute('SELECT * FROM users WHERE username = ?', ['test@example.com']);
    
    if (testUser.length > 0) {
      const isValid = await bcrypt.compare('test123', testUser[0].password);
      console.log('Password verification for test@example.com:', isValid ? 'Valid' : 'Invalid');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  }
  
  process.exit(0);
}

checkUsers();
