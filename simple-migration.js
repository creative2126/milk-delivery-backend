const mysql = require('mysql2/promise');

async function runSimpleMigration() {
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

        // Simple ALTER TABLE statements executed one by one
        const statements = [
            "ALTER TABLE subscriptions ADD COLUMN username VARCHAR(50) NOT NULL DEFAULT 'guest';",
            "ALTER TABLE subscriptions ADD COLUMN subscription_type VARCHAR(20) NOT NULL DEFAULT '500ml';",
            "ALTER TABLE subscriptions ADD COLUMN duration VARCHAR(50) NOT NULL DEFAULT '6days';",
            "ALTER TABLE subscriptions MODIFY COLUMN duration VARCHAR(50) NOT NULL DEFAULT '6days';",
            "ALTER TABLE subscriptions ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;",
            "ALTER TABLE subscriptions ADD COLUMN address TEXT;",
            "ALTER TABLE subscriptions ADD COLUMN building_name VARCHAR(100);",
            "ALTER TABLE subscriptions ADD COLUMN flat_number VARCHAR(20);",
            "ALTER TABLE subscriptions ADD COLUMN payment_id VARCHAR(100);",
            "ALTER TABLE subscriptions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';",
            "ALTER TABLE subscriptions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
            "ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
        ];

        console.log('Running simple migration...');

        for (const sql of statements) {
            try {
                await connection.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                if (err.message.includes('Duplicate column name')) {
                    console.log(`Column already exists, skipping: ${sql}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ Migration completed successfully!');

        // Show updated schema
        const [rows] = await connection.execute('DESCRIBE subscriptions');
        console.log('\nUpdated subscriptions table columns:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : ''} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runSimpleMigration();
