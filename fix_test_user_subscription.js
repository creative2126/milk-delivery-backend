const mysql = require('mysql2/promise');

async function fixTestUserSubscription() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('🔧 Fixing test user subscription...\n');

        // Update test user subscription to have a future end date
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

        await connection.execute(
            'UPDATE users SET subscription_end_date = ?, subscription_start_date = CURRENT_TIMESTAMP WHERE username = ?',
            [futureDate, 'testuser@gmail.com']
        );

        console.log('✅ Updated test user subscription end date to:', futureDate.toISOString());

        // Verify the update
        const [user] = await connection.execute(
            'SELECT subscription_status, subscription_start_date, subscription_end_date FROM users WHERE username = ?',
            ['testuser@gmail.com']
        );

        console.log('✅ Updated subscription details:');
        console.log(JSON.stringify(user[0], null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixTestUserSubscription();
