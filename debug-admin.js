const db = require('./backend/db');

async function debugAdmin() {
  console.log('=== DEBUGGING ADMIN PAGE ISSUE ===\n');
  
  try {
    // 1. Check if database is connected
    console.log('1. Testing database connection...');
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // 2. Check if subscriptions table exists
    console.log('\n2. Checking subscriptions table...');
    const [tables] = await db.execute('SHOW TABLES LIKE "subscriptions"');
    console.log('Subscriptions table exists:', tables.length > 0);
    
    // 3. Check total subscriptions
    console.log('\n3. Checking subscription count...');
    const [count] = await db.execute('SELECT COUNT(*) as total FROM subscriptions');
    console.log('Total subscriptions:', count[0].total);
    
    // 4. Check if admin users exist
    console.log('\n4. Checking admin users...');
    const [admins] = await db.execute('SELECT id, username, email, role FROM users WHERE role = "admin"');
    console.log('Admin users found:', admins.length);
    if (admins.length > 0) {
      console.log('Admin details:', admins[0]);
    }
    
    // 5. Get sample subscriptions
    console.log('\n5. Getting sample subscriptions...');
    const [subscriptions] = await db.execute('SELECT id, username, subscription_type, duration, amount, status, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 5');
    console.log('Sample subscriptions:', subscriptions);
    
    // 6. Test admin subscriptions endpoint
    console.log('\n6. Testing admin subscriptions query...');
    const [adminSubs] = await db.execute('SELECT id, username, subscription_type, duration, amount, address, building_name, flat_number, status, created_at, updated_at FROM subscriptions ORDER BY created_at DESC');
    console.log('Admin subscriptions count:', adminSubs.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

debugAdmin();
