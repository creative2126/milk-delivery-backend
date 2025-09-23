const mysql = require('mysql2/promise');

async function testExpiredSubscription() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // First, create a test user if not exists
        const testEmail = 'test@example.com';
        const [userRows] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [testEmail]
        );

        let userId;
        if (userRows.length === 0) {
            const [insertResult] = await connection.execute(
                'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())',
                ['Test User', testEmail, 'password']
            );
            userId = insertResult.insertId;
            console.log('Created test user with ID:', userId);
        } else {
            userId = userRows[0].id;
            console.log('Using existing test user with ID:', userId);
        }

        // Create an expired active subscription
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 10); // 10 days ago
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 4); // 4 days ago, so expired

        await connection.execute(
            `INSERT INTO subscriptions
             (user_id, product_id, subscription_type, quantity, frequency, delivery_address,
              start_date, end_date, status, total_amount, created_at)
             VALUES (?, 1, '500ml', 1, 'daily', 'Test Address',
                     ?, ?, 'active', 100, NOW())`,
            [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );

        console.log('Created expired active subscription');

        // Now test the update query
        const [updateResult] = await connection.execute(
            "UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND end_date < NOW()"
        );

        console.log('Updated', updateResult.affectedRows, 'expired subscriptions');

        // Check if the subscription is now expired
        const [subRows] = await connection.execute(
            'SELECT id, status, end_date FROM subscriptions WHERE user_id = ?',
            [userId]
        );

        console.log('Subscription status:', subRows);

        // Now try to create a new subscription (simulate the check)
        const [activeCheck] = await connection.execute(
            'SELECT id FROM subscriptions WHERE user_id = ? AND status = "active"',
            [userId]
        );

        if (activeCheck.length > 0) {
            console.log('ERROR: Still has active subscription!');
        } else {
            console.log('SUCCESS: No active subscriptions, can create new one');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testExpiredSubscription();
