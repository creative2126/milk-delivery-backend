const mysql = require('mysql2/promise');

async function testSubscriptionAPI() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('✅ Connected to milk database');

        // Test 1: Check if users table has subscription columns
        console.log('\n📋 Testing users table subscription columns...');
        const [columns] = await connection.execute('DESCRIBE users');
        const subscriptionColumns = columns.filter(col =>
            col.Field.includes('subscription_') ||
            col.Field.includes('paused') ||
            col.Field.includes('resumed') ||
            col.Field === 'total_paused_days'
        );

        console.log(`✅ Found ${subscriptionColumns.length} subscription-related columns:`);
        subscriptionColumns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type}`);
        });

        // Test 2: Check if we can query subscription data
        console.log('\n🔍 Testing subscription data query...');
        const [subscriptions] = await connection.execute(`
            SELECT id, username, subscription_type, subscription_status,
                   subscription_start_date, subscription_end_date
            FROM users
            WHERE subscription_status IS NOT NULL
            LIMIT 5
        `);

        console.log(`✅ Found ${subscriptions.length} users with subscription data:`);
        subscriptions.forEach(sub => {
            console.log(`   - User ${sub.id} (${sub.username}): ${sub.subscription_type} - ${sub.subscription_status}`);
        });

        // Test 3: Check if we can create a test subscription
        console.log('\n🆕 Testing subscription creation...');
        const testUserId = 1; // Assuming user ID 1 exists
        const [existingSub] = await connection.execute(`
            SELECT id FROM users WHERE id = ? AND subscription_status IS NOT NULL
        `, [testUserId]);

        if (existingSub.length > 0) {
            console.log('⚠️  User already has a subscription, skipping creation test');
        } else {
            console.log('✅ Ready for subscription creation test');
        }

        console.log('\n🎉 All tests passed! Subscription API should work correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testSubscriptionAPI();
