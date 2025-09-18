const mysql = require('mysql2/promise');

async function checkAllTables() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Get all tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('\nAll tables in milk database:');
        tables.forEach((row, index) => {
            console.log(`${index + 1}. ${Object.values(row)[0]}`);
        });

        // Check if there are multiple subscriptions-like tables
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            if (tableName.includes('subscription')) {
                console.log(`\n--- Table: ${tableName} ---`);
                const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
                columns.forEach(col => {
                    console.log(`  ${col.Field}: ${col.Type}`);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAllTables();
