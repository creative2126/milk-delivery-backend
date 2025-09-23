const mysql = require('mysql2/promise');

async function createTestActiveSubscription() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('🔧 Creating test user with active subscription for testing...\n');

        // Check if test user already exists
        const [existingUser] = await connection.execute(
            'SELECT id, username FROM users WHERE username = ?',
            ['testuser@gmail.com']
        );

        let userId;
        if (existingUser.length > 0) {
            userId = existingUser[0].id;
            console.log('✅ Test user already exists, using existing user');
        } else {
            // Create test user
            const [userResult] = await connection.execute(
                'INSERT INTO users (username, email, name, subscription_status, subscription_type, subscription_duration, subscription_end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['testuser@gmail.com', 'testuser@gmail.com', 'Test User', 'active', '1L Daily', '7days', '2025-01-30']
            );
            userId = userResult.insertId;
            console.log('✅ Created new test user');
        }

        // Check current subscription status
        const [currentSub] = await connection.execute(
            'SELECT subscription_status FROM users WHERE id = ?',
            [userId]
        );

        console.log(`Current subscription status: ${currentSub[0].subscription_status}`);

        if (currentSub[0].subscription_status === 'active') {
            console.log('✅ Test user already has active subscription');
        } else {
            // Update to active status
            await connection.execute(
                'UPDATE users SET subscription_status = ?, subscription_end_date = ? WHERE id = ?',
                ['active', '2025-01-30', userId]
            );
            console.log('✅ Updated test user to active subscription');
        }

        console.log('\n🎉 Test user ready for pause/resume testing!');
        console.log('Username: testuser@gmail.com');
        console.log('Subscription ID: 999 (use this for API testing)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestActiveSubscription();
