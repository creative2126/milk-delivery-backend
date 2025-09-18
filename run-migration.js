const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration(filePath) {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk',
            multipleStatements: true
        });

        console.log('Connected to milk database');

        // Read the SQL file
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log('Executing migration file:', filePath);

        // Execute the SQL
        await connection.execute(sql);
        console.log('✅ Migration executed successfully!');

        // Verify users table has id column
        const [usersColumns] = await connection.execute('DESCRIBE users');
        console.log('\nUsers table columns:');
        usersColumns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Key}`);
        });

        // Check sample data
        const [users] = await connection.execute('SELECT id, username, email FROM users LIMIT 3');
        console.log('\nSample users:');
        users.forEach(user => {
            console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });

        // Check subscriptions linkage
        const [subs] = await connection.execute(`
            SELECT s.id, s.username, s.user_id, u.username as user_username
            FROM subscriptions s
            LEFT JOIN users u ON s.user_id = u.id
            LIMIT 3
        `);
        console.log('\nSample subscriptions:');
        subs.forEach(sub => {
            console.log(`  Sub ID: ${sub.id}, Sub Username: ${sub.username}, User ID: ${sub.user_id}, User Username: ${sub.user_username}`);
        });

    } catch (error) {
        console.error('❌ Failed to execute migration:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Get file path from command line argument
const filePath = process.argv[2] || 'fix-users-primary-key.sql';
runMigration(filePath);
