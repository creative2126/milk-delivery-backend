const mysql = require('mysql2/promise');

async function checkMilkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check subscriptions table
        const [rows] = await connection.execute('DESCRIBE subscriptions');
        console.log('\nSubscriptions table columns:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type}`);
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkMilkSchema();
