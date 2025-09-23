const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function debugTestUserAPI() {
    console.log('🔍 Debugging Test User API...\n');

    try {
        const username = 'testuser@gmail.com';

        console.log(`Testing API endpoints for user: ${username}\n`);

        // Test 1: Profile endpoint
        console.log('1. Testing /api/profile endpoint...');
        const profileResponse = await fetch(`${BASE_URL}/api/profile?username=${username}`);
        const profileData = await profileResponse.json();
        console.log('Profile Response Status:', profileResponse.status);
        console.log('Profile Response:', JSON.stringify(profileData, null, 2));

        // Test 2: Subscriptions remaining endpoint
        console.log('\n2. Testing /api/subscriptions/remaining endpoint...');
        const subsResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/${username}`);
        const subsData = await subsResponse.json();
        console.log('Subscriptions Response Status:', subsResponse.status);
        console.log('Subscriptions Response:', JSON.stringify(subsData, null, 2));

        // Test 3: Direct database query test
        console.log('\n3. Testing direct database query...');
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk'
        });

        const [directResult] = await connection.execute(
            'SELECT subscription_type, subscription_duration, subscription_created_at, subscription_end_date, subscription_status FROM users WHERE username = ?',
            [username]
        );

        console.log('Direct DB Query Result:', JSON.stringify(directResult, null, 2));

        await connection.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugTestUserAPI();
