const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Database Configuration Diagnostic');
console.log('=====================================');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'root'}`);
console.log(`   DB_PASS: ${process.env.DB_PASS ? '***' : '(empty)'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'milk_delivery'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 3306}`);

// Test connection
console.log('\n🧪 Testing Connection...');
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'milk_delivery',
  port: process.env.DB_PORT || 3306
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if MySQL is running');
    console.error('   2. Verify credentials in .env file');
    console.error('   3. Check if database exists');
    console.error('   4. Check firewall settings');
    console.error('   5. Verify user permissions');
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    
    // Get server info
    connection.query('SELECT VERSION() as version', (err, results) => {
      if (!err) {
        console.log(`📊 MySQL Version: ${results[0].version}`);
      }
      
      // Get current database
      connection.query('SELECT DATABASE() as current_db', (err, results) => {
        if (!err) {
          console.log(`📋 Current Database: ${results[0].current_db}`);
        }
        
        // Get user info
        connection.query('SELECT CURRENT_USER() as user', (err, results) => {
          if (!err) {
            console.log(`👤 Connected as: ${results[0].user}`);
          }
          
          connection.end();
          console.log('\n🎉 Diagnostic completed successfully!');
        });
      });
    });
  }
});
