const mysql = require('mysql2/promise');

async function checkTriggersAndProcedures() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        console.log('Connected to milk database');

        // Check for triggers
        console.log('\n--- TRIGGERS ---');
        const [triggers] = await connection.execute('SHOW TRIGGERS');
        if (triggers.length === 0) {
            console.log('No triggers found');
        } else {
            triggers.forEach(trigger => {
                console.log(`Trigger: ${trigger.Trigger}`);
                console.log(`  Table: ${trigger.Table}`);
                console.log(`  Event: ${trigger.Event}`);
                console.log(`  Timing: ${trigger.Timing}`);
                console.log(`  Statement: ${trigger.Statement}`);
                console.log('---');
            });
        }

        // Check for stored procedures
        console.log('\n--- STORED PROCEDURES ---');
        const [procedures] = await connection.execute(`
            SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION
            FROM information_schema.ROUTINES
            WHERE ROUTINE_SCHEMA = 'milk'
            AND ROUTINE_TYPE = 'PROCEDURE'
        `);
        if (procedures.length === 0) {
            console.log('No stored procedures found');
        } else {
            procedures.forEach(proc => {
                console.log(`Procedure: ${proc.ROUTINE_NAME}`);
                console.log(`  Definition: ${proc.ROUTINE_DEFINITION}`);
                console.log('---');
            });
        }

        // Check for stored functions
        console.log('\n--- STORED FUNCTIONS ---');
        const [functions] = await connection.execute(`
            SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION
            FROM information_schema.ROUTINES
            WHERE ROUTINE_SCHEMA = 'milk'
            AND ROUTINE_TYPE = 'FUNCTION'
        `);
        if (functions.length === 0) {
            console.log('No stored functions found');
        } else {
            functions.forEach(func => {
                console.log(`Function: ${func.ROUTINE_NAME}`);
                console.log(`  Definition: ${func.ROUTINE_DEFINITION}`);
                console.log('---');
            });
        }

        // Check the active_subscriptions_view definition
        console.log('\n--- VIEW DEFINITIONS ---');
        const [views] = await connection.execute(`
            SELECT TABLE_NAME, VIEW_DEFINITION
            FROM information_schema.VIEWS
            WHERE TABLE_SCHEMA = 'milk'
        `);
        views.forEach(view => {
            console.log(`View: ${view.TABLE_NAME}`);
            console.log(`  Definition: ${view.VIEW_DEFINITION}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTriggersAndProcedures();
