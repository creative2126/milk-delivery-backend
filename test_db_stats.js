const db = require('./backend/db');

async function testStats() {
  try {
    console.log('Testing database stats queries...');

    const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM subscriptions');
    console.log('totalRows result:', JSON.stringify(totalRows, null, 2));

    const [activeRows] = await db.execute('SELECT COUNT(*) as active FROM subscriptions WHERE status = "active"');
    console.log('activeRows result:', JSON.stringify(activeRows, null, 2));

    const [revenueRows] = await db.execute('SELECT SUM(amount) as revenue FROM subscriptions WHERE status = "active"');
    console.log('revenueRows result:', JSON.stringify(revenueRows, null, 2));

    const [todayRows] = await db.execute(`SELECT COUNT(*) as today FROM subscriptions WHERE DATE(created_at) = CURDATE()`);
    console.log('todayRows result:', JSON.stringify(todayRows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

testStats();
