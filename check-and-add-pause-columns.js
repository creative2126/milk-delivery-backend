const mysql = require('mysql2/promise');

async function checkAndAddPauseColumns() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check current columns
        const [columns] = await connection.execute('DESCRIBE users');
        const columnNames = columns.map(col => col.Field);

        console.log('\nCurrent users table columns:');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type}`);
        });

        // Check if pause columns exist
        const pauseColumns = ['paused_at', 'resumed_at', 'total_paused_days'];
        const missingColumns = pauseColumns.filter(col => !columnNames.includes(col));

        if (missingColumns.length === 0) {
            console.log('\n✅ All pause/resume columns already exist in users table!');
            return;
        }

        console.log(`\n❌ Missing columns: ${missingColumns.join(', ')}`);

        // Add missing columns one by one
        for (const column of missingColumns) {
            try {
                let sql;
                if (column === 'paused_at' || column === 'resumed_at') {
                    sql = `ALTER TABLE users ADD COLUMN ${column} TIMESTAMP NULL DEFAULT NULL`;
                } else if (column === 'total_paused_days') {
                    sql = `ALTER TABLE users ADD COLUMN ${column} INT DEFAULT 0`;
                }

                await connection.execute(sql);
                console.log(`✅ Added column: ${column}`);
            } catch (error) {
                console.log(`⚠️  Could not add column ${column}: ${error.message}`);
            }
        }

        // Verify the new columns
        console.log('\n🔍 Verifying updated schema...');
        const [updatedColumns] = await connection.execute('DESCRIBE users');
        const pauseColumnsExist = pauseColumns.every(col =>
            updatedColumns.some(updatedCol => updatedCol.Field === col)
        );

        if (pauseColumnsExist) {
            console.log('✅ All pause/resume columns successfully added to users table!');
        } else {
            console.log('❌ Some pause/resume columns are still missing');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAndAddPauseColumns();
