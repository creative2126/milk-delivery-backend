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

    } catch (error) {
        console.error('❌ Failed to execute SQL file:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the migration
runSQLFile('backend/add-role-column.sql');
