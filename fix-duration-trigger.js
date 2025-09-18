const mysql = require('mysql2/promise');

async function fixDurationTrigger() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Drop the existing trigger
        console.log('Dropping existing trigger...');
        await connection.execute('DROP TRIGGER IF EXISTS set_subscription_end_date');

        // Create a new trigger that handles string durations
        const createTriggerSQL = `
            CREATE TRIGGER set_subscription_end_date
            BEFORE INSERT ON subscriptions
            FOR EACH ROW
            BEGIN
                DECLARE duration_days INT DEFAULT 0;

                -- Extract numeric part from duration string (e.g., '6days' -> 6)
                SET duration_days = CAST(REGEXP_SUBSTR(NEW.duration, '[0-9]+') AS UNSIGNED);

                -- If no numeric part found, default to 6 days
                IF duration_days = 0 THEN
                    SET duration_days = 6;
                END IF;

                IF NEW.end_date IS NULL AND NEW.start_date IS NOT NULL THEN
                    SET NEW.end_date = DATE_ADD(NEW.start_date, INTERVAL duration_days DAY);
                END IF;

                IF NEW.start_date IS NULL THEN
                    SET NEW.start_date = CURDATE();
                    SET NEW.end_date = DATE_ADD(CURDATE(), INTERVAL duration_days DAY);
                END IF;
            END
        `;

        console.log('Creating new trigger that handles string durations...');
        await connection.execute(createTriggerSQL);

        console.log('✅ Trigger updated successfully!');

        // Verify the trigger
        const [triggers] = await connection.execute('SHOW TRIGGERS WHERE `Trigger` = "set_subscription_end_date"');
        if (triggers.length > 0) {
            console.log('\nUpdated trigger:');
            console.log(`Trigger: ${triggers[0].Trigger}`);
            console.log(`  Table: ${triggers[0].Table}`);
            console.log(`  Event: ${triggers[0].Event}`);
            console.log(`  Timing: ${triggers[0].Timing}`);
            console.log(`  Statement: ${triggers[0].Statement.substring(0, 200)}...`);
        }

    } catch (error) {
        console.error('❌ Failed to update trigger:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixDurationTrigger();
