const mysql = require('mysql2/promise');

async function migrateUsersPrimaryKey() {
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

        // Check if id column exists in users table
        const [columns] = await connection.execute(
            'SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            ['milk', 'users', 'id']
        );

        if (columns[0].count === 0) {
            console.log('Adding id column to users table...');
            await connection.execute('ALTER TABLE users ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST');
            console.log('✅ Added id column to users table');
        } else {
            console.log('✅ id column already exists in users table');
        }

        // Update subscriptions.user_id based on username/email match
        console.log('Updating subscriptions.user_id...');
        const [updateResult] = await connection.execute(`
            UPDATE subscriptions s
            JOIN users u ON (s.username = u.username OR s.username = u.email)
            SET s.user_id = u.id
            WHERE s.user_id IS NULL OR s.user_id = 0
        `);
        console.log(`✅ Updated ${updateResult.affectedRows} subscription records`);

        // Check if foreign key exists
        const [fkCheck] = await connection.execute(
            'SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = ? AND CONSTRAINT_NAME = ?',
            ['milk', 'subscriptions', 'FOREIGN KEY', 'fk_subscriptions_user_id']
        );

        if (fkCheck[0].count === 0) {
            console.log('Adding foreign key constraint...');
            await connection.execute('ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
            console.log('✅ Added foreign key constraint');
        } else {
            console.log('✅ Foreign key constraint already exists');
        }

        // Verify the migration
        console.log('\n=== VERIFICATION ===');

        const [usersColumns] = await connection.execute('DESCRIBE users');
        console.log('\nUsers table columns:');
        usersColumns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Key}`);
        });

        const [users] = await connection.execute('SELECT id, username, email FROM users LIMIT 5');
        console.log('\nSample users:');
        users.forEach(user => {
            console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });

        const [subs] = await connection.execute(`
            SELECT s.id, s.username, s.user_id, u.username as user_username
            FROM subscriptions s
            LEFT JOIN users u ON s.user_id = u.id
            LIMIT 5
        `);
        console.log('\nSample subscriptions:');
        subs.forEach(sub => {
            console.log(`  Sub ID: ${sub.id}, Sub Username: ${sub.username}, User ID: ${sub.user_id}, User Username: ${sub.user_username}`);
        });

        const [summary] = await connection.execute(`
            SELECT
                COUNT(*) as total_subscriptions,
                COUNT(CASE WHEN s.user_id IS NOT NULL THEN 1 END) as linked_subscriptions,
                COUNT(CASE WHEN s.user_id IS NULL THEN 1 END) as unlinked_subscriptions
            FROM subscriptions s
        `);
        console.log('\nSubscription linkage summary:');
        console.log(`  Total subscriptions: ${summary[0].total_subscriptions}`);
        console.log(`  Linked subscriptions: ${summary[0].linked_subscriptions}`);
        console.log(`  Unlinked subscriptions: ${summary[0].unlinked_subscriptions}`);

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

migrateUsersPrimaryKey();
