const db = require('./backend/db');

async function checkSubscription() {
  try {
    const [rows] = await db.query('SELECT id, status, user_id, username FROM subscriptions WHERE id = 26');
    console.log('Subscription 26:', rows[0]);

    if (rows[0]) {
      const [userRows] = await db.query('SELECT id, subscription_status FROM users WHERE id = ?', [rows[0].user_id]);
      console.log('User data:', userRows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSubscription();
