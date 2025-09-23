const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createExpiredUser() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Hash password
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Insert expired_user
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, email, name, phone) VALUES (?, ?, ?, ?, ?)',
            ['expired_user', hashedPassword, 'expired@example.com', 'Expired User', '9876543211']
        );

        console.log('User expired_user created successfully with ID:', result.insertId);

        // Now create an EXPIRED subscription for expired_user (end_date in the past)
        const subscriptionData = {
            user_id: result.insertId,
            username: 'expired_user',
            subscription_type: '1L',
            duration: '6days',
            amount: '270.00',
            total_amount: '270.00',
            address: 'Test Address, Hyderabad',
            building_name: 'Test Building',
            flat_number: '102',
            payment_id: 'pay_test_expired_' + Date.now(),
            status: 'active' // Will be expired by the end_date
        };

        const [subResult] = await connection.execute(`
            INSERT INTO subscriptions (
                user_id, product_id, username, subscription_type, duration, amount, total_amount,
                address, building_name, flat_number, payment_id, status, created_at, end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY))
        `, [
            subscriptionData.user_id,
            1, // product_id
            subscriptionData.username,
            subscriptionData.subscription_type,
            subscriptionData.duration,
            subscriptionData.amount,
            subscriptionData.total_amount,
            subscriptionData.address,
            subscriptionData.building_name,
            subscriptionData.flat_number,
            subscriptionData.payment_id,
            subscriptionData.status
        ]);

        console.log('Expired subscription created for expired_user with ID:', subResult.insertId);

    } catch (error) {
        console.error('Error creating expired user:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createExpiredUser();
