const mysql = require('mysql2/promise');

async function checkSubscriptionConsistency() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('🔍 Checking subscription consistency in database...\n');

        // Check for users with inconsistent subscription states
        const inconsistentUsers = await connection.execute(`
            SELECT username, subscription_status, paused_at, resumed_at, total_paused_days
            FROM users
            WHERE subscription_status = 'paused' AND paused_at IS NULL
               OR subscription_status = 'active' AND paused_at IS NOT NULL AND resumed_at IS NULL
               OR subscription_status = 'paused' AND resumed_at IS NOT NULL
        `);

        if (inconsistentUsers[0].length > 0) {
            console.log('❌ Found inconsistent subscription states:');
            inconsistentUsers[0].forEach(user => {
                console.log(`   Username: ${user.username}, Status: ${user.subscription_status}, Paused: ${user.paused_at}, Resumed: ${user.resumed_at}`);
            });
            console.log('');
        } else {
            console.log('✅ No inconsistent subscription states found');
        }

        // Check for users with paused subscriptions but no paused_at timestamp
        const missingPausedTimestamp = await connection.execute(`
            SELECT username, subscription_status, paused_at
            FROM users
            WHERE subscription_status = 'paused' AND paused_at IS NULL
        `);

        if (missingPausedTimestamp[0].length > 0) {
            console.log('⚠️ Found paused subscriptions without timestamp:');
            missingPausedTimestamp[0].forEach(user => {
                console.log(`   Username: ${user.username}`);
            });

            // Fix by setting current timestamp as paused_at
            console.log('\n🔧 Fixing missing paused_at timestamps...');
            for (const user of missingPausedTimestamp[0]) {
                await connection.execute(
                    'UPDATE users SET paused_at = CURRENT_TIMESTAMP WHERE username = ?',
                    [user.username]
                );
                console.log(`   ✅ Fixed: ${user.username}`);
            }
        }

        // Check for users with active status but paused_at timestamp (should be resumed)
        const shouldBeResumed = await connection.execute(`
            SELECT username, subscription_status, paused_at, resumed_at
            FROM users
            WHERE subscription_status = 'active' AND paused_at IS NOT NULL AND resumed_at IS NULL
        `);

        if (shouldBeResumed[0].length > 0) {
            console.log('⚠️ Found active subscriptions with paused_at but no resumed_at:');
            shouldBeResumed[0].forEach(user => {
                console.log(`   Username: ${user.username}`);
            });

            // Fix by setting resumed_at timestamp
            console.log('\n🔧 Fixing missing resumed_at timestamps...');
            for (const user of shouldBeResumed[0]) {
                await connection.execute(
                    'UPDATE users SET resumed_at = CURRENT_TIMESTAMP WHERE username = ?',
                    [user.username]
                );
                console.log(`   ✅ Fixed: ${user.username}`);
            }
        }

        // Check for users with paused status but resumed_at timestamp (should be active)
        const shouldBeActive = await connection.execute(`
            SELECT username, subscription_status, paused_at, resumed_at
            FROM users
            WHERE subscription_status = 'paused' AND resumed_at IS NOT NULL
        `);

        if (shouldBeActive[0].length > 0) {
            console.log('⚠️ Found paused subscriptions with resumed_at timestamp:');
            shouldBeActive[0].forEach(user => {
                console.log(`   Username: ${user.username}`);
            });

            // Fix by setting status to active
            console.log('\n🔧 Fixing incorrect paused status...');
            for (const user of shouldBeActive[0]) {
                await connection.execute(
                    'UPDATE users SET subscription_status = "active" WHERE username = ?',
                    [user.username]
                );
                console.log(`   ✅ Fixed: ${user.username}`);
            }
        }

        // Check for users with negative or invalid total_paused_days
        const invalidPausedDays = await connection.execute(`
            SELECT username, total_paused_days
            FROM users
            WHERE total_paused_days < 0 OR total_paused_days > 365
        `);

        if (invalidPausedDays[0].length > 0) {
            console.log('⚠️ Found invalid total_paused_days values:');
            invalidPausedDays[0].forEach(user => {
                console.log(`   Username: ${user.username}, Days: ${user.total_paused_days}`);
            });

            // Fix by setting to 0
            console.log('\n🔧 Fixing invalid total_paused_days...');
            await connection.execute(
                'UPDATE users SET total_paused_days = 0 WHERE total_paused_days < 0 OR total_paused_days > 365'
            );
            console.log('   ✅ Fixed invalid total_paused_days values');
        }

        console.log('\n🎉 Subscription consistency check completed!');

    } catch (error) {
        console.error('❌ Error during consistency check:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkSubscriptionConsistency();
