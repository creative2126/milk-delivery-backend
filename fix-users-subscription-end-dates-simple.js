const mysql = require('mysql2/promise');

async function fixUsersSubscriptionEndDates() {
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'sushanth2126',
        database: 'milk',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // First, let's check what subscriptions have incorrect end dates
        console.log('🔍 Checking subscriptions with incorrect end dates...');
        const checkQuery = `
            SELECT
                u.id,
                u.username,
                u.subscription_type,
                u.subscription_duration,
                u.subscription_created_at,
                u.subscription_start_date,
                u.subscription_end_date,
                u.subscription_status,
                DATEDIFF(u.subscription_end_date, CURDATE()) as current_remaining_days
            FROM users u
            WHERE u.subscription_end_date = '1970-01-01'
               OR u.subscription_end_date IS NULL
               OR u.subscription_end_date < '2020-01-01'
               OR u.subscription_status IS NOT NULL
            ORDER BY u.subscription_created_at DESC
        `;

        const [checkResult] = await connection.execute(checkQuery);
        console.log(`📊 Found ${checkResult.length} subscriptions with issues:`);
        console.table(checkResult);

        // Fix subscriptions with null or 1970-01-01 end dates in users table
        console.log('🔧 Fixing subscription end dates...');
        const updateQuery = `
            UPDATE users
            SET subscription_end_date = CASE
                WHEN subscription_duration = '6days' THEN DATE_ADD(COALESCE(subscription_start_date, subscription_created_at), INTERVAL 7 DAY)
                WHEN subscription_duration = '15days' THEN DATE_ADD(COALESCE(subscription_start_date, subscription_created_at), INTERVAL 17 DAY)
                ELSE DATE_ADD(COALESCE(subscription_start_date, subscription_created_at), INTERVAL 7 DAY)
            END
            WHERE subscription_end_date = '1970-01-01'
               OR subscription_end_date IS NULL
               OR subscription_end_date < '2020-01-01'
        `;

        const [updateResult] = await connection.execute(updateQuery);
        console.log(`✅ Fixed ${updateResult.affectedRows} subscription end dates`);

        // Update status for expired subscriptions
        console.log('🔧 Updating expired subscription statuses...');
        const statusQuery = `
            UPDATE users
            SET subscription_status = 'expired'
            WHERE subscription_end_date < CURDATE()
              AND subscription_status = 'active'
        `;

        const [statusResult] = await connection.execute(statusQuery);
        console.log(`✅ Updated ${statusResult.affectedRows} subscription statuses to expired`);

        // Verify the fixes
        console.log('✅ Verification - Recent subscriptions with corrected dates:');
        const verifyQuery = `
            SELECT
                u.id,
                u.username,
                u.subscription_type,
                u.subscription_duration,
                u.subscription_created_at,
                u.subscription_start_date,
                u.subscription_end_date,
                u.subscription_status,
                GREATEST(DATEDIFF(u.subscription_end_date, CURDATE()), 0) as corrected_remaining_days
            FROM users u
            WHERE u.subscription_end_date >= '2020-01-01'
              AND u.subscription_status IS NOT NULL
            ORDER BY u.subscription_created_at DESC
            LIMIT 10
        `;

        const [verifyResult] = await connection.execute(verifyQuery);
        console.table(verifyResult);

        // Check for any remaining issues
        const finalCheckQuery = `
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.subscription_status IS NOT NULL
              AND (u.subscription_end_date = '1970-01-01'
                   OR u.subscription_end_date IS NULL
                   OR u.subscription_end_date < '2020-01-01')
        `;

        const [finalCheckResult] = await connection.execute(finalCheckQuery);
        if (finalCheckResult[0].count > 0) {
            console.log(`⚠️  Warning: ${finalCheckResult[0].count} subscriptions still have incorrect end dates`);
        } else {
            console.log('✅ All subscription end dates have been corrected successfully!');
        }

    } catch (error) {
        console.error('❌ Error fixing subscription end dates:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ Database connection closed');
        }
    }
}

// Run the fix if this script is executed directly
if (require.main === module) {
    fixUsersSubscriptionEndDates();
}

module.exports = fixUsersSubscriptionEndDates;
