const mysql = require('mysql2');
require('dotenv').config();

// Create connection without database to create the database
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'sushanth2126',
  port: process.env.DB_PORT || 3306
});

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...');
    
    // Create database
    await connection.promise().execute(
      'CREATE DATABASE IF NOT EXISTS milk'
    );
    console.log('✅ Database created successfully');

    // Use the database
    connection.changeUser({ database: 'milk' });

    // Create users table
    await connection.promise().execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        name VARCHAR(255),
        password VARCHAR(255),
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created successfully');

    // Create otp_verification table
    await connection.promise().execute(`
      CREATE TABLE IF NOT EXISTS otp_verification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        otp VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ OTP verification table created successfully');

    // Create subscriptions table
    await connection.promise().execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        subscription_type VARCHAR(50) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        address TEXT,
        building_name VARCHAR(255),
        flat_number VARCHAR(50),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        payment_id VARCHAR(255),
        status ENUM('active', 'inactive', 'expired', 'cancelled') DEFAULT 'active',
        paused_at TIMESTAMP NULL,
        resumed_at TIMESTAMP NULL,
        total_paused_days INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Subscriptions table created successfully');

    // Create subscription_history table
    await connection.promise().execute(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        username VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details JSON,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_username (username),
        INDEX idx_action_date (action_date)
      )
    `);
    console.log('✅ Subscription history table created successfully');

    // Insert default admin user (username: admin, password: admin123)
    const bcrypt = require('bcryptjs');
    const hashedPassword = '$2b$12$qTFU3TGwXpxEk686U8Kzgu8gqegYSDGQL0pVfMkTehKaK5MkGq2Qu';
    
    await connection.promise().execute(`
      INSERT IGNORE INTO users (username, email, password, name, role) 
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', 'admin@milk.com', hashedPassword, 'Admin User', 'admin']);
    console.log('✅ Default admin user created (admin/admin123)');

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test registration at: http://localhost:3001/test-registration.html');
    console.log('3. Admin login: username=admin, password=admin123');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('- Make sure MySQL is running');
    console.error('- Check your .env file credentials');
    console.error('- Verify MySQL user has proper permissions');
  } finally {
    connection.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
