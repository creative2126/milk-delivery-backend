const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        const hashed = await bcrypt.hash('password', 10);
        await connection.execute(
            'INSERT INTO users (username, password, email, name) VALUES (?, ?, ?, ?)',
            ['1', hashed, 'test@example.com', 'Test User']
        );

        console.log('Test user created successfully');
    } catch (error) {
        console.error('Error creating test user:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestUser();
