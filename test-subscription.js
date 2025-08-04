const db = require('./db');

async function createTestSubscription() {
  try {
    await db.execute(`
      INSERT INTO subscriptions (username, subscription_type, duration, amount, address, building_name, flat_number, payment_id, status) 
      VALUES ('testuser', 'Daily Milk', '30 days', 1500.00, '123 Test Street', 'Test Building', 'A101', 'test_payment_123', 'inactive')
    `);
    console.log('Test subscription created with inactive status');
  } catch (error) {
    console.error('Error creating test subscription:', error);
  }
  process.exit();
}

createTestSubscription();
