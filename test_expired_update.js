const mysql = require('mysql2/promise');

async function testExpiredUpdate() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        // Update expired subscriptions
        const [updateResult] = await connection.execute(
            "UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND end_date < NOW() AND user_id = ?",
            [19]
        );

        console.log('Updated expired subscriptions for user 19:', updateResult.affectedRows);

        // Check active subscriptions
        const [activeCheck] = await connection.execute(
            'SELECT id FROM subscriptions WHERE user_id = ? AND status = "active"',
            [19]
        );

        console.log('Active subscriptions for user 19:', activeCheck.length);

        if (activeCheck.length === 0) {
            console.log('SUCCESS: No active subscriptions, can create new one');
        } else {
            console.log('ERROR: Still has active subscriptions');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testExpiredUpdate();
