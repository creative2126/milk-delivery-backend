const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Starting migration to add paused_at column...');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'add-paused-at-column.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('📄 SQL content to execute:');
        console.log(sqlContent);
        console.log('---');

        // Execute the SQL
        await db.query(sqlContent);

        console.log('✅ Migration completed successfully!');
        console.log('✅ paused_at column has been added to subscriptions table');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close the database connection
        await db.close();
        process.exit(0);
    }
}

runMigration();
