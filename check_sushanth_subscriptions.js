const mysql = require('mysql2/promise');

async function checkUserSubscriptions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'milk_delivery'
  });

  try {
    // Check user 'sushanth' subscriptions
    const [rows] = await connection.execute(
      'SELECT id, username, subscription_status, subscription_end_date, subscription_start_date, subscription_type, subscription_duration FROM users WHERE username LIKE ?',
      ['%sushanth%']
    );

    console.log('=== User sushanth subscription data ===');
    rows.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Status: ${user.subscription_status}`);
      console.log(`  Start Date: ${user.subscription_start_date}`);
      console.log(`  End Date: ${user.subscription_end_date}`);
      console.log(`  Type: ${user.subscription_type}`);
      console.log(`  Duration: ${user.subscription_duration}`);

      if (user.subscription_end_date) {
        const endDate = new Date(user.subscription_end_date);
        const now = new Date();
        const isExpired = endDate < now;
        console.log(`  Is Expired: ${isExpired ? 'YES' : 'NO'}`);
        console.log(`  Days since expiry: ${isExpired ? Math.floor((now - endDate) / (1000 * 60 * 60 * 24)) : 'N/A'}`);
      } else {
        console.log('  End Date: NULL');
      }
      console.log('---');
    });

    // Count total active subscriptions that should be expired
    const [expiredCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE subscription_status = ? AND subscription_end_date IS NOT NULL AND subscription_end_date < NOW()',
      ['active']
    );

    console.log(`\nTotal active subscriptions that should be expired: ${expiredCount[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkUserSubscriptions();
