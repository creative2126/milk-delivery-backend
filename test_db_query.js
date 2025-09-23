const db = require('./backend/db');

async function testQuery() {
    try {
        console.log('Testing database query...');

        const query = `
          SELECT
            s.id,
            s.user_id,
            u.username,
            s.subscription_type,
            s.duration,
            s.amount,
            s.address,
            s.building_name,
            s.flat_number,
            s.status,
            s.payment_id,
            s.created_at
          FROM subscriptions s
          LEFT JOIN users u ON s.user_id = u.id
          ORDER BY s.created_at DESC
        `;

        const result = await db.execute(query);
        console.log('Query result:', result);
        console.log('Result type:', typeof result);
        console.log('Result length:', result ? result.length : 'N/A');

        if (result && result.length > 0) {
            console.log('First row:', result[0]);
        }

    } catch (error) {
        console.error('Query error:', error);
    }
}

testQuery();
