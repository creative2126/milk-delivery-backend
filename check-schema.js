const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'sushanth2126',
            database: process.env.DB_NAME || 'milk'
        });

        console.log('Connected to database');

        // Check subscriptions table
        const [rows] = await connection.execute('DESCRIBE subscriptions');
        console.log('\nSubscriptions table columns:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type}`);
        });

        // Check users table
        const [userRows] = await connection.execute('DESCRIBE users');
        console.log('\nUsers table columns:');
        userRows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type}`);
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSchema();
