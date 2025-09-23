const mysql = require('mysql2/promise');
const fs = require('fs');

async function runSimpleMigration() {
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
        const sql = fs.readFileSync('backend/add-subscription-columns-simple.sql', 'utf8');
        console.log('Executing SQL file: backend/add-subscription-columns-simple.sql');

        // Execute the SQL
        await connection.execute(sql);
        console.log('✅ Subscription columns added successfully!');

        // Verify the new columns
        const [columns] = await connection.execute('DESCRIBE users');
        console.log('\nUpdated users table columns:');
        columns.forEach(col => {
            if (col.Field.includes('subscription_') || col.Field.includes('paused') ||
                col.Field.includes('resumed') || col.Field.includes('total_paused_days')) {
                console.log(`  ✅ ${col.Field}: ${col.Type}`);
            }
        });

    } catch (error) {
        console.error('❌ Failed to execute SQL file:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runSimpleMigration();
