const mysql = require('mysql2/promise');

async function dropTablesSimple() {
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

        // Drop tables directly
        console.log('\n🗑️  Dropping subscription-related tables...');

        const tablesToDrop = [
            'subscriptions',
            'subscription_history',
            'subscription_status_history',
            'subscription_errors'
        ];

        for (const tableName of tablesToDrop) {
            try {
                await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
                console.log(`✅ Successfully dropped table: ${tableName}`);
            } catch (error) {
                console.log(`❌ Failed to drop table ${tableName}:`, error.message);
            }
        }

        // Final verification
        console.log('\n📋 Final verification...');

        const [tables] = await connection.execute('SHOW TABLES LIKE "subscription%"');
        if (tables.length > 0) {
            console.log('⚠️  Remaining subscription-related tables:');
            tables.forEach(table => {
                console.log(`   - ${Object.values(table)[0]}`);
            });
        } else {
            console.log('✅ All subscription-related tables have been removed!');
        }

        console.log('\n🎉 Table cleanup completed!');

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
    dropTablesSimple()
        .then(() => {
            console.log('\n✅ Simple cleanup script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Simple cleanup script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { dropTablesSimple };
