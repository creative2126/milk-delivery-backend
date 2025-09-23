const db = require('./backend/db');

async function checkTables() {
    try {
        console.log('Checking database tables...');

        // Check if tables exist
        const tablesResult = await db.query('SHOW TABLES');
        console.log('Tables in database:', tablesResult);

        // Check subscriptions table structure
        try {
            const subsStructure = await db.query('DESCRIBE subscriptions');
            console.log('Subscriptions table structure:', subsStructure);
        } catch (error) {
            console.error('Error describing subscriptions table:', error.message);
        }

        // Check users table structure
        try {
            const usersStructure = await db.query('DESCRIBE users');
            console.log('Users table structure:', usersStructure);
        } catch (error) {
            console.error('Error describing users table:', error.message);
        }

        // Check if there are any subscriptions
        try {
            const subsCount = await db.query('SELECT COUNT(*) as count FROM subscriptions');
            console.log('Total subscriptions:', subsCount);
        } catch (error) {
            console.error('Error counting subscriptions:', error.message);
        }

    } catch (error) {
        console.error('Database error:', error);
    }
}

checkTables();
