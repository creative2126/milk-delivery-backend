const mysql = require('mysql2/promise');
const fs = require('fs');

async function runSQLFile(filePath) {
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
        console.log('Executing SQL file:', filePath);

        // Execute the SQL
        await connection.execute(sql);
        console.log('✅ SQL file executed successfully!');

        // Verify the trigger
        const [triggers] = await connection.execute('SHOW TRIGGERS WHERE `Trigger` = "set_subscription_end_date"');
        if (triggers.length > 0) {
            console.log('\nUpdated trigger:');
            console.log(`Trigger: ${triggers[0].Trigger}`);
            console.log(`  Table: ${triggers[0].Table}`);
            console.log(`  Event: ${triggers[0].Event}`);
            console.log(`  Timing: ${triggers[0].Timing}`);
        }

    } catch (error) {
        console.error('❌ Failed to execute SQL file:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the trigger fix
runSQLFile('backend/fix-duration-trigger.sql');
