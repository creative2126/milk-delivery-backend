const db = require('./db');

async function checkCurrentUsersSchema() {
    try {
        console.log('Checking current users table schema...');

        // Check users table
        const [rows] = await db.query('DESCRIBE users');
        console.log('\nCurrent users table columns:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type} ${row.Key ? `(${row.Key})` : ''}`);
        });

        // Check sample users with subscription data
        const [userRows] = await db.query('SELECT id, username, email FROM users LIMIT 5');
        console.log('\nSample users:');
        userRows.forEach(user => {
            console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });

        console.log('\nSchema check completed successfully');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkCurrentUsersSchema();
