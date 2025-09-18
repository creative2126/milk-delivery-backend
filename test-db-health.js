const db = require('./db');

async function checkDatabaseHealth() {
  console.log('🔍 Checking database health...');
  
  try {
    // Test basic connection
    console.log('Testing database connection...');
    const [result] = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful:', result);
    
    // Check users table schema
    console.log('Checking users table schema...');
    const [usersTable] = await db.execute('DESCRIBE users');
    console.log('✅ Users table schema:', usersTable);
    
    console.log('Database health check passed.');
  } catch (error) {
    console.error('❌ Database health check failed:', error);
  }
}

checkDatabaseHealth();
