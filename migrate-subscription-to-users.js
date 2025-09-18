const db = require('./db');

async function migrateSubscriptionToUsers() {
  try {
    // Add subscription columns to users table if not exist
    const alterQuery = `
      ALTER TABLE users
      ADD COLUMN subscription_type VARCHAR(20) DEFAULT NULL,
      ADD COLUMN subscription_duration VARCHAR(50) DEFAULT NULL,
      ADD COLUMN subscription_status VARCHAR(20) DEFAULT NULL,
      ADD COLUMN subscription_start_date DATE DEFAULT NULL,
      ADD COLUMN subscription_end_date DATE DEFAULT NULL
    `;

    try {
      await db.query(alterQuery);
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        throw err;
      }
    }

    // For each user, get their most recent active subscription and update users table
    const usersResult = await db.query('SELECT id, username FROM users');
    let users;
    if (Array.isArray(usersResult)) {
      users = usersResult.length > 0 && Array.isArray(usersResult[0]) ? usersResult[0] : usersResult;
    } else {
      users = [];
    }

    for (const user of users) {
      const subsResult = await db.query(
        `SELECT subscription_type, duration, status, start_date, end_date
         FROM subscriptions
         WHERE user_id = ?
           AND status IN ('active', 'paused', 'expired')
         ORDER BY CASE WHEN status = 'active' THEN 1 ELSE 0 END DESC, created_at DESC
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
        await db.query(
          `UPDATE users SET
            subscription_type = ?,
            subscription_duration = ?,
            subscription_status = ?,
            subscription_start_date = ?,
            subscription_end_date = ?
           WHERE id = ?`,
          [
            sub.subscription_type,
            sub.duration,
            sub.status,
            sub.start_date,
            sub.end_date,
            user.id
          ]
        );
      }
    }

    console.log('Subscription data migrated to users table successfully.');
  } catch (error) {
    console.error('Error migrating subscription data to users table:', error);
  }
}

migrateSubscriptionToUsers();
