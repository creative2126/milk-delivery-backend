const mysql = require('mysql2');

function fixTriggerWithoutDelimiter() {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'sushanth2126',
        database: 'milk'
    });

    connection.connect((err) => {
        if (err) {
            console.error('❌ Connection failed:', err.message);
            return;
        }

        console.log('Connected to milk database');

        // Drop the existing trigger
        console.log('Dropping existing trigger...');
        connection.query('DROP TRIGGER IF EXISTS set_subscription_end_date', (err, results) => {
            if (err) {
                console.error('❌ Failed to drop trigger:', err.message);
                connection.end();
                return;
            }

            console.log('Trigger dropped successfully');

            // Create the new trigger with free days logic
            const createTriggerSQL = `
                CREATE TRIGGER set_subscription_end_date
                BEFORE INSERT ON subscriptions
                FOR EACH ROW
                BEGIN
                    DECLARE duration_days INT DEFAULT 0;
                    DECLARE final_days INT DEFAULT 0;

                    -- Extract numeric part from duration string (e.g., '6days' -> 6)
                    SET duration_days = CAST(REGEXP_SUBSTR(NEW.duration, '[0-9]+') AS UNSIGNED);

                    -- If no numeric part found, default to 6 days
                    IF duration_days = 0 THEN
                        SET duration_days = 6;
                    END IF;

                    -- Add free days: 6days -> 7 days, 15days -> 17 days
                    IF duration_days = 6 THEN
                        SET final_days = 7;
                    ELSEIF duration_days = 15 THEN
                        SET final_days = 17;
                    ELSE
                        SET final_days = duration_days;
                    END IF;

                    IF NEW.end_date IS NULL AND NEW.start_date IS NOT NULL THEN
                        SET NEW.end_date = DATE_ADD(NEW.start_date, INTERVAL final_days DAY);
                    END IF;

                    IF NEW.start_date IS NULL THEN
                        SET NEW.start_date = CURDATE();
                        SET NEW.end_date = DATE_ADD(CURDATE(), INTERVAL final_days DAY);
                    END IF;
                END
            `;

            console.log('Creating new trigger...');
            connection.query(createTriggerSQL, (err, results) => {
                if (err) {
                    console.error('❌ Failed to create trigger:', err.message);
                    connection.end();
                    return;
                }

                console.log('✅ Trigger created successfully!');

                // Verify the trigger
                connection.query('SHOW TRIGGERS WHERE `Trigger` = "set_subscription_end_date"', (err, results) => {
                    if (err) {
                        console.error('❌ Failed to verify trigger:', err.message);
                    } else if (results.length > 0) {
                        console.log('\nUpdated trigger:');
                        console.log(`Trigger: ${results[0].Trigger}`);
                        console.log(`  Table: ${results[0].Table}`);
                        console.log(`  Event: ${results[0].Event}`);
                        console.log(`  Timing: ${results[0].Timing}`);
                    }

                    connection.end();
                });
            });
        });
    });
}

fixTriggerWithoutDelimiter();
