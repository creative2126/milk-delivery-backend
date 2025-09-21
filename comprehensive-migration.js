const db = require('./db');

async function comprehensiveMigration() {
  try {
    console.log('Starting comprehensive subscription to users migration...');

    // Step 1: Add all subscription columns to users table
    const alterQuery = `
      ALTER TABLE users
      ADD COLUMN subscription_type VARCHAR(50) DEFAULT NULL,
      ADD COLUMN subscription_duration VARCHAR(50) DEFAULT NULL,
      ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN subscription_total_amount DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN subscription_address TEXT DEFAULT NULL,
      ADD COLUMN subscription_building_name VARCHAR(255) DEFAULT NULL,
      ADD COLUMN subscription_flat_number VARCHAR(50) DEFAULT NULL,
      ADD COLUMN subscription_payment_id VARCHAR(255) DEFAULT NULL,
      ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive',
      ADD COLUMN subscription_start_date DATE DEFAULT NULL,
      ADD COLUMN subscription_end_date DATE DEFAULT NULL,
      ADD COLUMN subscription_created_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      ADD COLUMN subscription_product_id INT DEFAULT 1
    `;

    try {
      await db.query(alterQuery);
      console.log('✓ Added subscription columns to users table');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        throw err;
      } else {
        console.log('✓ Subscription columns already exist in users table');
      }
    }

    // Step 2: Get all users and their subscription data
    const usersResult = await db.query('SELECT id, username FROM users');
    let users;
    if (Array.isArray(usersResult)) {
      users = usersResult.length > 0 && Array.isArray(usersResult[0]) ? usersResult[0] : usersResult;
    } else {
      users = [];
    }

    console.log(`Found ${users.length} users to process`);

    // Step 3: Migrate subscription data for each user
    for (const user of users) {
      try {
        // Get the most recent subscription for this user (prioritize active, then paused, then expired)
        const subsResult = await db.query(
          `SELECT
            subscription_type, duration, amount, total_amount, address,
            building_name, flat_number, payment_id, status, start_date,
            end_date, created_at, updated_at, product_id
           FROM subscriptions
           WHERE user_id = ?
           ORDER BY
             CASE
               WHEN status = 'active' THEN 1
               WHEN status = 'paused' THEN 2
               WHEN status = 'expired' THEN 3
               ELSE 4
             END,
             created_at DESC
           LIMIT 1`,
          [user.id]
        );

        let subs;
        if (Array.isArray(subsResult)) {
          subs = subsResult.length > 0 && Array.isArray(subsResult[0]) ? subsResult[0] : subsResult;
        } else {
          subs = [];
        }

        if (subs.length > 0) {
          const sub = subs[0];

          // Update users table with subscription data
          await db.query(
            `UPDATE users SET
              subscription_type = ?,
              subscription_duration = ?,
              subscription_amount = ?,
              subscription_total_amount = ?,
              subscription_address = ?,
              subscription_building_name = ?,
              subscription_flat_number = ?,
              subscription_payment_id = ?,
              subscription_status = ?,
              subscription_start_date = ?,
              subscription_end_date = ?,
              subscription_created_at = ?,
              subscription_updated_at = ?,
              subscription_product_id = ?
             WHERE id = ?`,
            [
              sub.subscription_type,
              sub.duration,
              sub.amount,
              sub.total_amount,
              sub.address,
              sub.building_name,
              sub.flat_number,
              sub.payment_id,
              sub.status,
              sub.start_date,
              sub.end_date,
              sub.created_at,
              sub.updated_at,
              sub.product_id || 1,
              user.id
            ]
          );

          console.log(`✓ Migrated subscription data for user ${user.username} (ID: ${user.id})`);
        } else {
          console.log(`- No subscription found for user ${user.username} (ID: ${user.id})`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user.username}:`, userError.message);
      }
    }

    // Step 4: Create backup of subscriptions table before dropping
    console.log('Creating backup of subscriptions table...');
    try {
      await db.query('CREATE TABLE subscriptions_backup AS SELECT * FROM subscriptions');
      console.log('✓ Created subscriptions_backup table');
    } catch (backupError) {
      console.log('⚠ Could not create backup (table might already exist):', backupError.message);
    }

    // Step 5: Verify migration success
    const [migrationCheck] = await db.query(
      'SELECT COUNT(*) as users_with_subscriptions FROM users WHERE subscription_status IS NOT NULL'
    );

    console.log(`✓ Migration completed. ${migrationCheck[0].users_with_subscriptions} users now have subscription data in users table`);

    // Step 6: Drop subscriptions table (uncomment when ready to drop)
    /*
    console.log('Dropping subscriptions table...');
    await db.query('DROP TABLE subscriptions');
    console.log('✓ Subscriptions table dropped successfully');
    */

    console.log('Migration completed successfully!');
    console.log('Note: Subscriptions table is preserved. Uncomment the DROP TABLE line when ready to remove it.');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  comprehensiveMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = comprehensiveMigration;
