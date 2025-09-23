const mysql = require('mysql2/promise');

async function checkUsersColumns() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check users table columns
        const [columns] = await connection.execute('DESCRIBE users');
        console.log('\nUsers table columns:');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type}`);
        });

        // Check if subscription columns exist
        const subscriptionColumns = [
            'subscription_type', 'subscription_duration', 'subscription_amount',
            'subscription_address', 'subscription_building_name', 'subscription_flat_number',
            'subscription_payment_id', 'subscription_status', 'subscription_start_date',
            'subscription_end_date', 'subscription_created_at', 'subscription_updated_at',
            'paused_at', 'resumed_at', 'total_paused_days'
        ];

        console.log('\nSubscription-related columns:');
        subscriptionColumns.forEach(col => {
            const exists = columns.some(dbCol => dbCol.Field === col);
            console.log(`  ${col}: ${exists ? '✅' : '❌'}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkUsersColumns();
