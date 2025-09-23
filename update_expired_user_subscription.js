const mysql = require('mysql2/promise');

async function updateExpiredUserSubscription() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Update expired_user subscription to have past end_date and status 'expired'
        const [result] = await connection.execute(
            "UPDATE subscriptions SET end_date = DATE_SUB(NOW(), INTERVAL 1 DAY), status = 'expired' WHERE username = ?",
            ['expired_user']
        );

        console.log('Updated expired_user subscription:', result);

    } catch (error) {
        console.error('Error updating expired user subscription:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateExpiredUserSubscription();
