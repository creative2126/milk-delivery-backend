const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixUsersSubscriptionEndDates() {
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

        // Read and execute the SQL fix file
        const sqlFilePath = path.join(__dirname, 'fix-users-subscription-end-dates.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split the SQL file into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📋 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
                } catch (error) {
                    console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                    console.error('Statement:', statement.substring(0, 100) + '...');
                }
            }
        }

        console.log('✅ All SQL statements executed');

        // Verify the fixes by checking a few subscriptions
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
            LIMIT 5
        `;

        const [verifyResult] = await connection.execute(verifyQuery);
        console.log('✅ Verification - Recent subscriptions with corrected dates:');
        console.table(verifyResult);

        // Check for any remaining issues
        const checkQuery = `
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.subscription_status IS NOT NULL
              AND (u.subscription_end_date = '1970-01-01'
                   OR u.subscription_end_date IS NULL
                   OR u.subscription_end_date < '2020-01-01')
        `;

        const [checkResult] = await connection.execute(checkQuery);
        if (checkResult[0].count > 0) {
            console.log(`⚠️  Warning: ${checkResult[0].count} subscriptions still have incorrect end dates`);
        } else {
            console.log('✅ All subscription end dates have been corrected');
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
