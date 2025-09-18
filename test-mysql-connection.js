const mysql = require('mysql2');
require('dotenv').config();

// Test MySQL connection with detailed diagnostics
async function testConnection() {
  console.log('🔍 Testing MySQL connection...');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'sushanth2126',
    database: process.env.DB_NAME || 'milk_delivery',
    port: process.env.DB_PORT || 3306,
  };

  console.log('Configuration:', {
    host: config.host,
    user: config.user,
    database: config.database,
    port: config.port
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection successful!');
    
    const result = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', result[0]);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Suggested fixes:');
      console.error('1. Check if MySQL is running: mysql -u root -p');
      console.error('2. Reset root password if needed');
      console.error('3. Create a new MySQL user for the application');
      console.error('4. Update .env file with correct credentials');
    }
    
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('🎉 Database connection is working!');
  } else {
    console.log('⚠️  Please fix the connection issues above');
  }
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
