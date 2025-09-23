const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createRajeshUser() {
    const connection = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'milk_delivery',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Insert user
        const [result] = await connection.execute(
            `INSERT INTO users (username, password, name, email, phone, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            ['rajesh', hashedPassword, 'Rajesh Kumar', 'rajesh@example.com', '9876543210']
        );

        console.log('User rajesh created successfully with ID:', result.insertId);
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await connection.end();
    }
}

createRajeshUser();
