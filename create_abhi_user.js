const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAbhiUser() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'milk',
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected to database');

        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            ['abhi', 'abhi@example.com']
        );

        if (existingUsers.length > 0) {
            console.log('User abhi already exists');
            return;
        }

        // Create the user
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, name, phone, email) VALUES (?, ?, ?, ?, ?)',
            ['abhi', '$2a$10$hashedpassword', 'Abhi User', '9876543210', 'abhi@example.com']
        );

        console.log('User abhi created successfully with ID:', result.insertId);

        // Verify the user was created
        const [users] = await connection.execute(
            'SELECT id, username, email, name FROM users WHERE username = ?',
            ['abhi']
        );

        console.log('Created user:', users[0]);

    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createAbhiUser();
