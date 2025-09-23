const mysql = require('mysql2/promise');

async function checkTestUser() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('🔍 Checking test user details...\n');

        // Check test user details
        const [user] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            ['testuser@gmail.com']
        );

        if (user.length > 0) {
            console.log('✅ Test user found:');
            console.log(JSON.stringify(user[0], null, 2));
        } else {
            console.log('❌ Test user not found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTestUser();
