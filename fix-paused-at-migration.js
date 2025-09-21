const db = require('./db');

async function runMigration() {
    try {
        console.log('🚀 Starting migration to add paused_at column...');

        // Execute the ALTER TABLE statement
        const alterStatement = 'ALTER TABLE subscriptions ADD COLUMN paused_at TIMESTAMP NULL DEFAULT NULL';
        console.log('📄 Executing:', alterStatement);

        await db.query(alterStatement);

        console.log('✅ Migration completed successfully!');
        console.log('✅ paused_at column has been added to subscriptions table');

        // Verify the column was added
        console.log('🔍 Verifying column exists...');
        const describeResult = await db.query('DESCRIBE subscriptions');
        const hasPausedAt = describeResult.some(col => col.Field === 'paused_at');

        if (hasPausedAt) {
            console.log('✅ paused_at column successfully added to subscriptions table');
        } else {
            console.log('❌ paused_at column not found after migration');
        }

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
