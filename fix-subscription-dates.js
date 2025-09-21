const mysql = require('mysql2/promise');

async function fixSubscriptionDates() {
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'milk',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Fix subscriptions with null or 1970-01-01 end dates
        const updateQuery = `
            UPDATE subscriptions
            SET end_date = CASE
                WHEN duration = '6days' THEN DATE_ADD(COALESCE(start_date, created_at), INTERVAL 7 DAY)
                WHEN duration = '15days' THEN DATE_ADD(COALESCE(start_date, created_at), INTERVAL 17 DAY)
                ELSE DATE_ADD(COALESCE(start_date, created_at), INTERVAL 7 DAY)
            END
            WHERE end_date = '1970-01-01'
               OR end_date IS NULL
               OR end_date < '2020-01-01'
        `;

        const [updateResult] = await connection.execute(updateQuery);
        console.log(`✅ Fixed ${updateResult.affectedRows} subscription end dates`);

        // Update status for expired subscriptions
        const statusQuery = `
            UPDATE subscriptions
            SET status = 'expired'
            WHERE end_date < CURDATE()
              AND status = 'active'
        `;

        const [statusResult] = await connection.execute(statusQuery);
        console.log(`✅ Updated ${statusResult.affectedRows} subscription statuses to expired`);

        // Verify the fixes
        const verifyQuery = `
            SELECT
                s.id,
                s.username,
                s.subscription_type,
                s.duration,
                s.created_at,
                s.start_date,
                s.end_date,
                s.status,
                GREATEST(DATEDIFF(s.end_date, CURDATE()), 0) as corrected_remaining_days
            FROM subscriptions s
            WHERE s.end_date >= '2020-01-01'
            ORDER BY s.created_at DESC
            LIMIT 5
        `;

        const [verifyResult] = await connection.execute(verifyQuery);
        console.log('✅ Verification - Recent subscriptions:');
        console.table(verifyResult);

    } catch (error) {
        console.error('❌ Error fixing subscription dates:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ Database connection closed');
        }
    }
}

fixSubscriptionDates();
