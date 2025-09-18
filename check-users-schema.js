const mysql = require('mysql2/promise');

async function checkUsersSchema() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check users table
        const [rows] = await connection.execute('DESCRIBE users');
        console.log('\nCurrent users table columns:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type} ${row.Key ? `(${row.Key})` : ''}`);
        });

        // Check if user sushanth596@gmail.com exists
        const [userRows] = await connection.execute('SELECT id, username, email FROM users WHERE email = ?', ['sushanth596@gmail.com']);
        console.log('\nUser sushanth596@gmail.com:');
        console.log(userRows);

        // Check subscriptions for this user
        if (userRows.length > 0) {
            const userId = userRows[0].id;
            const [subRows] = await connection.execute('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
            console.log(`\nSubscriptions for user_id ${userId}:`);
            console.log(subRows);
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUsersSchema();
