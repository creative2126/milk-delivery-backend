const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function mergeSubscriptionAndUsersTables() {
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

        // Step 1: Check current table structures
        console.log('\n📋 Checking current table structures...');
        const [usersColumns] = await connection.execute('DESCRIBE users');
        const [subscriptionsColumns] = await connection.execute('DESCRIBE subscriptions');

        console.log('Users table columns:', usersColumns.map(col => col.Field).join(', '));
        console.log('Subscriptions table columns:', subscriptionsColumns.map(col => col.Field).join(', '));

        // Step 2: Execute the migration SQL
        console.log('\n🔄 Executing migration SQL...');
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'merge-subscription-users.sql'), 'utf8');
        await connection.execute(migrationSQL);

        // Step 3: Verify migration results
        console.log('\n✅ Migration SQL executed successfully');

        const [migrationResults] = await connection.execute(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE subscription_status IS NOT NULL) as users_with_subscriptions,
                (SELECT COUNT(*) FROM users WHERE subscription_status = 'active') as active_subscriptions,
                (SELECT COUNT(*) FROM subscriptions) as remaining_subscriptions
        `);

        console.log('\n📊 Migration Results:');
        console.log('Users with subscription data:', migrationResults[0].users_with_subscriptions);
        console.log('Active subscriptions:', migrationResults[0].active_subscriptions);
        console.log('Remaining subscriptions records:', migrationResults[0].remaining_subscriptions);

        // Step 4: Show sample data to verify
        console.log('\n📋 Sample user data with subscription info:');
        const [sampleData] = await connection.execute(`
            SELECT id, username, subscription_type, subscription_status, subscription_amount
            FROM users
            WHERE subscription_status IS NOT NULL
            LIMIT 5
        `);

        console.table(sampleData);

        // Step 5: Drop the subscriptions table (only if migration was successful)
        if (migrationResults[0].users_with_subscriptions > 0) {
            console.log('\n🗑️  Dropping subscriptions table...');
            await connection.execute('DROP TABLE IF EXISTS subscriptions');
            console.log('✅ Subscriptions table dropped successfully');
        } else {
            console.log('⚠️  Migration may have failed - not dropping subscriptions table');
        }

        // Step 6: Clean up any subscription-related tables that are no longer needed
        const tablesToCheck = ['subscription_history', 'subscription_status_history', 'subscription_errors'];

        for (const tableName of tablesToCheck) {
            const [tables] = await connection.execute('SHOW TABLES LIKE ?', [tableName]);
            if (tables.length > 0) {
                console.log(`🧹 Dropping ${tableName} table...`);
                await connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
                console.log(`✅ ${tableName} table dropped`);
            }
        }

        // Step 7: Final verification
        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📋 Final table structure:');

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

    } catch (error) {
        console.error('❌ Error during migration:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the migration
if (require.main === module) {
    mergeSubscriptionAndUsersTables()
        .then(() => {
            console.log('\n🎉 Migration script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { mergeSubscriptionAndUsersTables };
