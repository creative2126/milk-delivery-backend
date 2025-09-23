const mysql = require('mysql2/promise');

async function checkExpiredUserDetails() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check expired_user subscription details
        const [rows] = await connection.execute(
            'SELECT id, username, status, end_date FROM subscriptions WHERE username = ?',
            ['expired_user']
        );

        if (rows.length > 0) {
            const subscription = rows[0];
            console.log('Subscription details:', subscription);

            // Calculate remaining days manually
            const endDate = new Date(subscription.end_date);
            const now = new Date();
            const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            console.log('Current time:', now.toISOString());
            console.log('End date:', endDate.toISOString());
            console.log('Remaining days:', remainingDays);
        }

        console.log('Expired user subscription details:');
        console.log(JSON.stringify(rows, null, 2));

    } catch (error) {
        console.error('Error checking expired user details:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkExpiredUserDetails();
