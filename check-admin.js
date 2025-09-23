const db = require('./backend/db');

async function checkAdmin() {
  try {
    console.log('Checking admin users...');
    
    // Check if users table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "users"');
    console.log('Users table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Check admin users
      const [adminUsers] = await db.execute(
        'SELECT id, username, email, role FROM users WHERE role = "admin"'
      );
      console.log('Admin users found:', adminUsers);
      
      // Check all users
      const [allUsers] = await db.execute(
        'SELECT id, username, email, role FROM users'
      );
      console.log('All users:', allUsers);
      
      // Check table structure
      const [columns] = await db.execute('DESCRIBE users');
      console.log('Table structure:', columns.map(col => col.Field));
    }
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
