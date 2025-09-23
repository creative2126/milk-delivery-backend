const mysql = require('mysql2/promise');

async function checkKarthikSubscriptions() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check user karthik
        const [userResult] = await connection.execute(
            'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
            ['karthik', 'karthik']
        );
        console.log('User karthik found:', userResult);

        if (userResult.length > 0) {
            const userId = userResult[0].id;
            console.log('User ID:', userId);

            // Check subscriptions for karthik
            const [subsResult] = await connection.execute(
                'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            console.log('Subscriptions for karthik:', subsResult);

            // Also check by username
            const [subsByUsername] = await connection.execute(
                'SELECT * FROM subscriptions WHERE username = ? ORDER BY created_at DESC',
                ['karthik']
            );
            console.log('Subscriptions by username karthik:', subsByUsername);

            // Check all subscriptions with status active/inactive/expired
            const [activeSubs] = await connection.execute(
                'SELECT * FROM subscriptions WHERE username = ? AND status IN ("active", "inactive", "expired") ORDER BY created_at DESC',
                ['karthik']
            );
            console.log('Active/inactive/expired subscriptions for karthik:', activeSubs);

        } else {
            console.log('User karthik not found');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkKarthikSubscriptions();
