const db = require('./db');
const bcrypt = require('bcryptjs');

async function setupTestData() {
  try {
    // Create test user first
    const hashedPassword = await bcrypt.hash('testpass', 10);
    await db.execute(`
      INSERT IGNORE INTO users (username, password, email) 
      VALUES ('testuser', ?, 'test@example.com')
    `, [hashedPassword]);
    
    // Create test subscription with inactive status
    await db.execute(`
      INSERT IGNORE INTO subscriptions (username, subscription_type, duration, amount, address, building_name, flat_number, payment_id, status) 
      VALUES ('testuser', 'Daily Milk', '30 days', 1500.00, '123 Test Street', 'Test Building', 'A101', 'test_payment_123', 'inactive')
    `);
    console.log('Test user and subscription created with inactive status');
  } catch (error) {
    console.error('Error creating test data:', error);
  }
  process.exit();
}

setupTestData();
