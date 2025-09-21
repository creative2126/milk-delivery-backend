const mysql = require('mysql2/promise');

async function cleanupMigration() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk_delivery'
        });

        console.log('✅ Connected to milk_delivery database');

        // Step 1: Check current state
        console.log('\n📋 Step 1: Checking current state...');
        const [results] = await connection.execute(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE subscription_status IS NOT NULL) as users_with_subscriptions,
                (SELECT COUNT(*) FROM users WHERE subscription_status = 'active') as active_subscriptions,
                (SELECT COUNT(*) FROM subscriptions) as remaining_subscriptions
        `);

        console.log('Current state:');
        console.log('Users with subscription data:', results[0].users_with_subscriptions);
        console.log('Active subscriptions:', results[0].active_subscriptions);
        console.log('Remaining subscriptions records:', results[0].remaining_subscriptions);

        // Step 2: Drop foreign key constraints
        console.log('\n📋 Step 2: Dropping foreign key constraints...');

        // Get all foreign key constraints
        const [constraints] = await connection.execute(`
            SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_NAME = 'subscriptions'
            AND TABLE_SCHEMA = 'milk_delivery'
        `);

        console.log('Found foreign key constraints:', constraints.length);

        for (const constraint of constraints) {
            try {
                await connection.execute(`ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
                console.log(`✅ Dropped constraint ${constraint.CONSTRAINT_NAME} from ${constraint.TABLE_NAME}`);
            } catch (error) {
                console.log(`⚠️  Failed to drop constraint ${constraint.CONSTRAINT_NAME}:`, error.message);
            }
        }

        // Step 3: Drop subscription-related tables
        console.log('\n📋 Step 3: Dropping subscription-related tables...');

        const tablesToDrop = [
            'subscription_status_history',
            'subscription_history',
            'subscription_errors',
            'subscriptions'
        ];

        for (const tableName of tablesToDrop) {
            try {
                const [tables] = await connection.execute('SHOW TABLES LIKE ?', [tableName]);
                if (tables.length > 0) {
                    await connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
                    console.log(`✅ Dropped table: ${tableName}`);
                } else {
                    console.log(`⚠️  Table ${tableName} does not exist`);
                }
            } catch (error) {
                console.log(`❌ Failed to drop table ${tableName}:`, error.message);
            }
        }

        // Step 4: Create indexes for better performance
        console.log('\n📋 Step 4: Creating indexes...');
        try {
            await connection.execute('CREATE INDEX idx_subscription_status ON users(subscription_status)');
            console.log('✅ Index on subscription_status created');
        } catch (error) {
            console.log('⚠️  Index creation failed:', error.message);
        }

        try {
            await connection.execute('CREATE INDEX idx_subscription_type ON users(subscription_type)');
            console.log('✅ Index on subscription_type created');
        } catch (error) {
            console.log('⚠️  Index creation failed:', error.message);
        }

        // Step 5: Final verification
        console.log('\n📋 Step 5: Final verification...');

        // Check users table structure
        const [finalColumns] = await connection.execute('DESCRIBE users');
        const subscriptionColumns = finalColumns.filter(col => col.Field.startsWith('subscription_'));
        console.log('Subscription-related columns in users table:');
        subscriptionColumns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type}`);
        });

        // Show summary statistics
        const [stats] = await connection.execute(`
            SELECT
                COUNT(*) as total_users,
                COUNT(CASE WHEN subscription_status IS NOT NULL THEN 1 END) as users_with_subscription,
                COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN subscription_status = 'inactive' THEN 1 END) as inactive_subscriptions
            FROM users
        `);

        console.log('\n📊 Final Statistics:');
        console.table(stats);

        // Show sample data
        console.log('\n📋 Sample user data with subscription info:');
        const [sampleData] = await connection.execute(`
            SELECT id, username, subscription_type, subscription_status, subscription_amount
            FROM users
            WHERE subscription_status IS NOT NULL
            LIMIT 5
        `);

        console.table(sampleData);

        // Check if subscriptions table still exists
        const [tables] = await connection.execute('SHOW TABLES LIKE "subscriptions"');
        if (tables.length > 0) {
            console.log('\n⚠️  WARNING: subscriptions table still exists!');
        } else {
            console.log('\n✅ Old subscriptions table successfully removed');
        }

        console.log('\n🎉 Migration cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the cleanup
if (require.main === module) {
    cleanupMigration()
        .then(() => {
            console.log('\n✅ Cleanup script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Cleanup script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { cleanupMigration };
