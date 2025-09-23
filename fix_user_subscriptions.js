const mysql = require('mysql2/promise');

async function fixUserSubscriptions() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'sushanth2126',
        database: 'milk'
    });

    try {
        // Get user ID for tej@gmail.com
        const [userRows] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            ['tej@gmail.com']
        );

        if (userRows.length === 0) {
            console.log('User tej@gmail.com not found');
            return;
        }

        const correctUserId = userRows[0].id;
        console.log('Correct user ID for tej@gmail.com:', correctUserId);

        // Update subscriptions from user_id = 1 to correct user_id
        const [updateResult] = await connection.execute(
            'UPDATE subscriptions SET user_id = ?, username = ? WHERE user_id = ?',
            [correctUserId, 'tej@gmail.com', 1]
        );

        console.log('Updated subscriptions:', updateResult.affectedRows);

        // Verify the update
        const [subscriptions] = await connection.execute(
            'SELECT id, user_id, username, subscription_type, status FROM subscriptions WHERE user_id = ?',
            [correctUserId]
        );

        console.log('Subscriptions for tej@gmail.com:');
        subscriptions.forEach(sub => {
            console.log(`ID: ${sub.id}, Type: ${sub.subscription_type}, Status: ${sub.status}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixUserSubscriptions();
