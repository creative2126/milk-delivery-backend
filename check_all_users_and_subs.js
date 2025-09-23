const mysql = require('mysql2/promise');

async function checkAllUsersAndSubs() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check all users
        const [allUsers] = await connection.execute(
            'SELECT id, username, email FROM users ORDER BY id DESC LIMIT 20'
        );
        console.log('All users:', allUsers);

        // Check all subscriptions
        const [allSubs] = await connection.execute(
            'SELECT id, user_id, username, subscription_type, status, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 20'
        );
        console.log('All subscriptions:', allSubs);

        // Check subscriptions with status active/inactive/expired
        const [activeSubs] = await connection.execute(
            'SELECT id, user_id, username, subscription_type, status, created_at FROM subscriptions WHERE status IN ("active", "inactive", "expired") ORDER BY created_at DESC LIMIT 20'
        );
        console.log('Active/inactive/expired subscriptions:', activeSubs);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAllUsersAndSubs();
