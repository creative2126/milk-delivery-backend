const mysql = require('mysql2/promise');

async function dropSubscriptionsTable() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('✅ Connected to milk database');

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

        // Step 2: Check for foreign key constraints
        console.log('\n📋 Step 2: Checking foreign key constraints...');
        const [constraints] = await connection.execute(`
            SELECT
                TABLE_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME
            FROM
                information_schema.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_NAME = 'subscriptions'
                AND TABLE_SCHEMA = 'milk'
        `);

        console.log('Found foreign key constraints:', constraints.length);
        constraints.forEach(constraint => {
            console.log(`  - ${constraint.TABLE_NAME}.${constraint.CONSTRAINT_NAME} -> ${constraint.REFERENCED_TABLE_NAME}`);
        });

        // Step 3: Drop foreign key constraints
        console.log('\n📋 Step 3: Dropping foreign key constraints...');
        for (const constraint of constraints) {
            try {
                await connection.execute(`ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
                console.log(`✅ Dropped constraint ${constraint.CONSTRAINT_NAME} from ${constraint.TABLE_NAME}`);
            } catch (error) {
                console.log(`⚠️  Failed to drop constraint ${constraint.CONSTRAINT_NAME}:`, error.message);
            }
        }

        // Step 4: Drop subscription-related tables
        console.log('\n📋 Step 4: Dropping subscription-related tables...');
        const tablesToDrop = [
            'subscriptions',
            'subscription_history',
            'subscription_status_history',
            'subscription_errors'
        ];

        for (const tableName of tablesToDrop) {
            try {
                // Check if table exists
                const [tables] = await connection.execute('SHOW TABLES LIKE ?', [tableName]);
                if (tables.length > 0) {
                    await connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
                    console.log(`✅ Dropped table: ${tableName}`);
                } else {
                    console.log(`⚠️  Table ${tableName} does not exist, skipping...`);
                }
            } catch (error) {
                console.log(`❌ Failed to drop table ${tableName}:`, error.message);
            }
        }

        // Step 5: Final verification
        console.log('\n📋 Step 5: Final verification...');

        // Check if subscriptions table still exists
        const [tables] = await connection.execute('SHOW TABLES LIKE "subscriptions"');
        if (tables.length > 0) {
            console.log('⚠️  WARNING: subscriptions table still exists!');
        } else {
            console.log('✅ Subscriptions table successfully removed');
        }

        // Show final statistics
        const [finalStats] = await connection.execute(`
            SELECT
                COUNT(*) as total_users,
                COUNT(CASE WHEN subscription_status IS NOT NULL THEN 1 END) as users_with_subscription,
                COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN subscription_status = 'inactive' THEN 1 END) as inactive_subscriptions
            FROM users
        `);

        console.log('\n📊 Final Statistics:');
        console.table(finalStats);

        console.log('\n🎉 Subscriptions table cleanup completed successfully!');

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
    dropSubscriptionsTable()
        .then(() => {
            console.log('\n✅ Cleanup script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Cleanup script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { dropSubscriptionsTable };
