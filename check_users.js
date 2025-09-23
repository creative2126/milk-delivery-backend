const mysql = require('mysql2/promise');

async function checkUsers() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check all users
        const [usersResult] = await connection.execute(
            'SELECT id, username, email, name FROM users ORDER BY created_at DESC LIMIT 10'
        );
        console.log('Recent users:', usersResult);

        // Check specifically for s@gmail.com
        const [specificUser] = await connection.execute(
            'SELECT id, username, email, name FROM users WHERE username = ? OR email = ?',
            ['s@gmail.com', 's@gmail.com']
        );
        console.log('User s@gmail.com:', specificUser);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkUsers();
