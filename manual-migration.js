const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function manualMigration() {
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

        // Step 1: Add subscription columns to users table
        console.log('\n📋 Step 1: Adding subscription columns to users table...');
        const addColumnsSQL = fs.readFileSync(path.join(__dirname, 'add-subscription-columns.sql'), 'utf8');

        // Split the SQL into individual statements and execute them one by one
        const statements = addColumnsSQL.split(';').filter(stmt => stmt.trim().length > 0);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement.length > 0) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Column ${i + 1}/${statements.length} added successfully`);
                } catch (error) {
                    if (error.message.includes('Duplicate column name')) {
                        console.log(`⚠️  Column ${i + 1}/${statements.length} already exists, skipping...`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        // Step 2: Create indexes for better performance
        console.log('\n📋 Step 2: Creating indexes...');
        try {
            await connection.execute('CREATE INDEX IF NOT EXISTS idx_subscription_status ON users(subscription_status)');
            console.log('✅ Index on subscription_status created');
        } catch (error) {
            console.log('⚠️  Index creation failed:', error.message);
        }

        try {
            await connection.execute('CREATE INDEX IF NOT EXISTS idx_subscription_type ON users(subscription_type)');
            console.log('✅ Index on subscription_type created');
        } catch (error) {
            console.log('⚠️  Index creation failed:', error.message);
        }

        // Step 3: Migrate data from subscriptions to users table
        console.log('\n📋 Step 3: Migrating subscription data...');
        const migrateQuery = `
            UPDATE users u
            JOIN subscriptions s ON u.username = s.username
            SET
                u.subscription_type = s.subscription_type,
                u.subscription_duration = s.duration,
                u.subscription_amount = s.amount,
                u.subscription_address = s.address,
                u.subscription_building_name = s.building_name,
                u.subscription_flat_number = s.flat_number,
                u.subscription_payment_id = s.payment_id,
                u.subscription_status = s.status,
                u.subscription_created_at = s.created_at,
                u.subscription_updated_at = s.updated_at
        `;

        const [migrateResult] = await connection.execute(migrateQuery);
        console.log(`✅ Migrated ${migrateResult.affectedRows} user subscription records`);

        // Step 4: Set default status for users without subscriptions
        console.log('\n📋 Step 4: Setting default subscription status...');
        const [defaultResult] = await connection.execute(
            "UPDATE users SET subscription_status = 'inactive' WHERE subscription_status IS NULL"
        );
        console.log(`✅ Set default status for ${defaultResult.affectedRows} users`);

        // Step 5: Verify migration results
        console.log('\n📋 Step 5: Verifying migration results...');
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

        // Step 6: Show sample data to verify
        console.log('\n📋 Step 6: Sample user data with subscription info:');
        const [sampleData] = await connection.execute(`
            SELECT id, username, subscription_type, subscription_status, subscription_amount
            FROM users
            WHERE subscription_status IS NOT NULL
            LIMIT 5
        `);

        console.table(sampleData);

        // Step 7: Drop the subscriptions table (only if migration was successful)
        if (migrationResults[0].users_with_subscriptions > 0) {
            console.log('\n📋 Step 7: Dropping subscriptions table...');
            await connection.execute('DROP TABLE IF EXISTS subscriptions');
            console.log('✅ Subscriptions table dropped successfully');
        } else {
            console.log('⚠️  Migration may have failed - not dropping subscriptions table');
        }

        // Step 8: Final verification
        console.log('\n📋 Step 8: Final verification...');
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

        console.log('\n🎉 Migration completed successfully!');

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
    manualMigration()
        .then(() => {
            console.log('\n✅ Manual migration script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Manual migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { manualMigration };
