const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createKarthikUser() {
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

        // Insert karthik user
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, email, name, phone) VALUES (?, ?, ?, ?, ?)',
            ['karthik', hashedPassword, 'karthik@example.com', 'Karthik User', '9876543210']
        );

        console.log('User karthik created successfully with ID:', result.insertId);

        // Now create a test subscription for karthik
        const subscriptionData = {
            user_id: result.insertId,
            username: 'karthik',
            subscription_type: '1L',
            duration: '6days',
            amount: '270.00',
            total_amount: '270.00',
            address: 'Test Address, Hyderabad',
            building_name: 'Test Building',
            flat_number: '101',
            payment_id: 'pay_test_karthik_' + Date.now(),
            status: 'active'
        };

        const [subResult] = await connection.execute(`
            INSERT INTO subscriptions (
                user_id, product_id, username, subscription_type, duration, amount, total_amount,
                address, building_name, flat_number, payment_id, status, created_at, end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 6 DAY))
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

        console.log('Test subscription created for karthik with ID:', subResult.insertId);

    } catch (error) {
        console.error('Error creating karthik user:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createKarthikUser();
