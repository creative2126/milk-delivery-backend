const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUserS() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        // First, delete the existing user if it exists
        await connection.execute('DELETE FROM users WHERE username = ? OR email = ?', ['s@gmail.com', 's@gmail.com']);

        // Create a new user with known password
        const hashed = await bcrypt.hash('password123', 10);
        await connection.execute(
            'INSERT INTO users (username, password, email, name) VALUES (?, ?, ?, ?)',
            ['s@gmail.com', hashed, 's@gmail.com', 'Test User S']
        );

        console.log('Test user s@gmail.com created successfully with password: password123');
    } catch (error) {
        console.error('Error creating test user:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestUserS();
