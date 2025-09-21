const mysql = require('mysql2/promise');

async function directMigration() {
    let connection;

    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk',
            multipleStatements: true // Allow multiple statements
        });

        console.log('✅ Connected to milk database');

        // Step 1: Add subscription columns one by one
        console.log('\n📋 Step 1: Adding subscription columns...');

        const columnsToAdd = [
            'subscription_type VARCHAR(50) DEFAULT NULL',
            'subscription_duration VARCHAR(50) DEFAULT NULL',
            'subscription_amount DECIMAL(10,2) DEFAULT NULL',
            'subscription_address TEXT DEFAULT NULL',
            'subscription_building_name VARCHAR(255) DEFAULT NULL',
            'subscription_flat_number VARCHAR(50) DEFAULT NULL',
            'subscription_payment_id VARCHAR(255) DEFAULT NULL',
            'subscription_status VARCHAR(20) DEFAULT NULL',
            'subscription_start_date DATE DEFAULT NULL',
            'subscription_end_date DATE DEFAULT NULL',
            'subscription_created_at TIMESTAMP DEFAULT NULL',
            'subscription_updated_at TIMESTAMP DEFAULT NULL'
        ];

        for (let i = 0; i < columnsToAdd.length; i++) {
            const column = columnsToAdd[i];
            try {
                await connection.execute(`ALTER TABLE users ADD COLUMN ${column}`);
                console.log(`✅ Added column: ${column.split(' ')[0]}`);
            } catch (error) {
                if (error.message.includes('Duplicate column name')) {
                    console.log(`⚠️  Column ${column.split(' ')[0]} already exists, skipping...`);
                } else {
                    console.log(`❌ Error adding column ${column.split(' ')[0]}:`, error.message);
                }
            }
        }

        // Step 2: Create indexes
        console.log('\n📋 Step 2: Creating indexes...');
        try {
            await connection.execute('CREATE INDEX idx_subscription_status ON users(subscription_status)');
            console.log('✅ Index on subscription_status created');
        } catch (error) {
            console.log('⚠️  Index creation failed:', error.message);
        }

        // Step 3: Migrate data
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

        // Step 4: Set default status
        console.log('\n📋 Step 4: Setting default subscription status...');
        const [defaultResult] = await connection.execute(
            "UPDATE users SET subscription_status = 'inactive' WHERE subscription_status IS NULL"
        );
        console.log(`✅ Set default status for ${defaultResult.affectedRows} users`);

        // Step 5: Verify results
        console.log('\n📋 Step 5: Verifying migration results...');
        const [results] = await connection.execute(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE subscription_status IS NOT NULL) as users_with_subscriptions,
                (SELECT COUNT(*) FROM users WHERE subscription_status = 'active') as active_subscriptions
        `);

        console.log('\n📊 Migration Results:');
        console.log('Users with subscription data:', results[0].users_with_subscriptions);
        console.log('Active subscriptions:', results[0].active_subscriptions);

        // Step 6: Show sample data
        console.log('\n📋 Step 6: Sample user data with subscription info:');
        const [sampleData] = await connection.execute(`
            SELECT id, username, subscription_type, subscription_status, subscription_amount
            FROM users
            WHERE subscription_status IS NOT NULL
            LIMIT 5
        `);

        console.table(sampleData);

        // Step 7: Drop subscriptions table
        console.log('\n📋 Step 7: Dropping subscriptions table...');
        await connection.execute('DROP TABLE IF EXISTS subscriptions');
        console.log('✅ Subscriptions table dropped successfully');

        // Step 8: Final verification
        console.log('\n📋 Step 8: Final verification...');
        const [finalColumns] = await connection.execute('DESCRIBE users');
        const subscriptionColumns = finalColumns.filter(col => col.Field.startsWith('subscription_'));
        console.log('Subscription-related columns in users table:');
        subscriptionColumns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type}`);
        });

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
    directMigration()
        .then(() => {
            console.log('\n✅ Direct migration script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Direct migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { directMigration };
