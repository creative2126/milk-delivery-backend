const fetch = require('node-fetch');

async function testProfileAPI() {
    try {
        console.log('Testing profile API with real user...');
        const response = await fetch('http://localhost:3001/api/profile?username=sushanth596@gmail.com');
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error testing profile API:', error.message);
    }
}

async function testSubscriptionAPI() {
    try {
        console.log('\nTesting subscription API with real user...');
        const response = await fetch('http://localhost:3001/api/subscriptions/remaining/sushanth596@gmail.com');
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error testing subscription API:', error.message);
    }
}

testProfileAPI();
testSubscriptionAPI();
