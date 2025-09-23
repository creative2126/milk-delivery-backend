const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'sushanth2126',
    database: 'milk'
};

async function checkActiveSubscriptions(username) {
    let connection;

    try {
        console.log(`Checking active subscriptions for user: ${username}`);

        connection = await mysql.createConnection(dbConfig);

        // First, find the user ID
        const [userRows] = await connection.execute(
            'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (userRows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const userId = userRows[0].id;
        console.log(`Found user ID: ${userId} for username: ${userRows[0].username}`);

        // Check active subscriptions
        const [subscriptionRows] = await connection.execute(
            'SELECT id, subscription_type, status, created_at, end_date FROM subscriptions WHERE user_id = ? AND status = "active"',
            [userId]
        );

        console.log(`\nActive subscriptions for user ${username}:`);
        if (subscriptionRows.length === 0) {
            console.log('✅ No active subscriptions found');
        } else {
            console.log('❌ Found active subscriptions:');
            subscriptionRows.forEach(sub => {
                console.log(`  - ID: ${sub.id}, Type: ${sub.subscription_type}, Status: ${sub.status}, Created: ${sub.created_at}, End: ${sub.end_date}`);
            });
        }

    } catch (error) {
        console.error('Error checking subscriptions:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Usage: node check_user_active_subscriptions.js <username>
const username = process.argv[2];
if (!username) {
    console.log('Usage: node check_user_active_subscriptions.js <username>');
    process.exit(1);
}

checkActiveSubscriptions(username);
