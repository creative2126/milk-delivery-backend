const mysql = require('mysql2/promise');

async function fixExpiredSubscriptions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sushanth2126',
    database: 'milk'
  });

  try {
    console.log('🔍 Checking for expired subscriptions that need to be fixed...');

    // Find all subscriptions that should be expired but still show as active
    const [expiredSubscriptions] = await connection.execute(
      'SELECT id, username, subscription_status, subscription_end_date, subscription_start_date FROM users WHERE subscription_status = ? AND subscription_end_date IS NOT NULL AND subscription_end_date < NOW()',
      ['active']
    );

    console.log(`Found ${expiredSubscriptions.length} expired subscriptions that need fixing:`);
    expiredSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. User: ${sub.username} (ID: ${sub.id})`);
      console.log(`   End Date: ${sub.subscription_end_date}`);
      console.log(`   Days expired: ${Math.floor((new Date() - new Date(sub.subscription_end_date)) / (1000 * 60 * 60 * 24))}`);
    });

    if (expiredSubscriptions.length > 0) {
      console.log('\n🔧 Fixing expired subscriptions...');

      // Update all expired subscriptions to 'expired' status
      const [updateResult] = await connection.execute(
        'UPDATE users SET subscription_status = ? WHERE subscription_status = ? AND subscription_end_date IS NOT NULL AND subscription_end_date < NOW()',
        ['expired', 'active']
      );

      console.log(`✅ Fixed ${updateResult.affectedRows} expired subscriptions`);

      // Verify the fix
      const [remainingExpired] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE subscription_status = ? AND subscription_end_date IS NOT NULL AND subscription_end_date < NOW()',
        ['active']
      );

      console.log(`Remaining active subscriptions that should be expired: ${remainingExpired[0].count}`);

      if (remainingExpired[0].count === 0) {
        console.log('🎉 All expired subscriptions have been fixed!');
      }
    } else {
      console.log('✅ No expired subscriptions found that need fixing.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixExpiredSubscriptions();
