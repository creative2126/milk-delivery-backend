const mysql = require('mysql2/promise');

async function checkUserSubscriptions() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check user
        const [userResult] = await connection.execute(
            'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
            ['s@gmail.com', 's@gmail.com']
        );
        console.log('User found:', userResult);

        if (userResult.length > 0) {
            const userId = userResult[0].id;
            console.log('User ID:', userId);

            // Check subscriptions
            const [subsResult] = await connection.execute(
                'SELECT * FROM subscriptions WHERE user_id = ?',
                [userId]
            );
            console.log('Subscriptions for user:', subsResult);

            // Check all subscriptions
            const [allSubs] = await connection.execute(
                'SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10'
            );
            console.log('Recent subscriptions:', allSubs);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkUserSubscriptions();
