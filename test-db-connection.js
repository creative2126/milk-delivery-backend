const db = require('./db.js');

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    // Test basic connection
    console.log('📡 Attempting to connect to database...');
    const [result] = await db.query('SELECT 1 as test');
    
    if (result && result[0] && result[0].test === 1) {
      console.log('✅ Basic connection test: PASSED');
    } else {
      console.log('❌ Basic connection test: FAILED');
      return false;
    }

    // Test database info
    console.log('📊 Fetching database information...');
    const [dbInfo] = await db.query('SELECT DATABASE() as db_name, VERSION() as version');
    console.log(`📋 Database: ${dbInfo[0].db_name}`);
    console.log(`🔧 MySQL Version: ${dbInfo[0].version}`);

    // Test table existence
    console.log('📋 Checking table existence...');
    const [tables] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    
    console.log(`📊 Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Test users table
    console.log('👥 Testing users table...');
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`👤 Users table has ${userCount[0].count} records`);

    // Test products table
    console.log('🥛 Testing products table...');
    const [productCount] = await db.query('SELECT COUNT(*) as count FROM products');
    console.log(`🥛 Products table has ${productCount[0].count} records`);

    // Test orders table
    console.log('📦 Testing orders table...');
    const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📦 Orders table has ${orderCount[0].count} records`);

    // Test connection pool
    console.log('🔄 Testing connection pool...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(db.query('SELECT CONNECTION_ID() as connection_id'));
    }
    const results = await Promise.all(promises);
    const uniqueConnections = new Set(results.map(r => r[0][0].connection_id));
    console.log(`🔗 Connection pool test: ${uniqueConnections.size} unique connections used`);

    console.log('🎉 All database tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('🔍 Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    return false;
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = testDatabaseConnection;
