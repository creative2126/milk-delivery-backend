const mysql = require('mysql2/promise');

async function fixDurationColumn() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Alter the duration column from INT to VARCHAR(50)
        const alterQuery = `
            ALTER TABLE subscriptions
            MODIFY COLUMN duration VARCHAR(50) NOT NULL DEFAULT '6days'
        `;

        console.log('Altering duration column...');
        await connection.execute(alterQuery);
        console.log('✅ Duration column altered successfully!');

        // Show updated schema
        const [rows] = await connection.execute('DESCRIBE subscriptions');
        console.log('\nUpdated subscriptions table columns:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : ''} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
        });

    } catch (error) {
        console.error('❌ Failed to alter duration column:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixDurationColumn();
