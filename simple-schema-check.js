const db = require('./db');

async function simpleSchemaCheck() {
    try {
        console.log('Checking users table schema...');

        const result = await db.query('DESCRIBE users');
        console.log('Query result:', result);

        if (result && result.length > 0) {
            console.log('Columns found:');
            result.forEach(col => {
                console.log(`  ${col.Field}: ${col.Type}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

simpleSchemaCheck();
