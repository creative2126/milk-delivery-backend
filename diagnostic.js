const db = require('./db');

async function runDiagnostics() {
  console.log('🔍 Running Registration Diagnostics...\n');
  
  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    await db.execute('SELECT 1');
    console.log('✅ Database connection successful');
    
    // 2. Check if users table exists
    console.log('\n2. Checking users table...');
    const [tables] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'milk_delivery' 
      AND TABLE_NAME = 'users'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist');
      console.log('📋 Creating users table...');
      
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          phone VARCHAR(20),
          address TEXT,
          name VARCHAR(100),
          role ENUM('user', 'admin') DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_email (email)
        )
      `);
      console.log('✅ Users table created successfully');
    } else {
      console.log('✅ Users table exists');
      
      // 3. Check table structure
      console.log('\n3. Checking users table structure...');
      const [columns] = await db.execute('DESCRIBE users');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
      
      // 4. Check for any existing users
      console.log('\n4. Checking existing users...');
      const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Total users: ${users[0].count}`);
    }
    
    console.log('\n🎉 All diagnostics completed successfully!');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Ensure MySQL server is running');
    console.error('2. Check database credentials in db.js');
    console.error('3. Verify database "milk_delivery" exists');
    console.error('4. Check MySQL user permissions');
  }
}

runDiagnostics();
