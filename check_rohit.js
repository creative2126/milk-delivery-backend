const db = require('./backend/db');

async function checkRohit() {
    try {
        const users = await db.query('SELECT id, username, email, name FROM users WHERE username = ? OR email = ?', ['rohit', 'rohit']);
        console.log('Users found for rohit:', users);

        const subs = await db.query('SELECT id, username, status, subscription_type FROM subscriptions WHERE username = ?', ['rohit']);
        console.log('Subscriptions for rohit:', subs);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRohit();
