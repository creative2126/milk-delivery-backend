const axios = require('axios');

async function testAdminEndpoints() {
    const baseURL = 'http://localhost:3001';

    try {
        console.log('Testing admin endpoints...');

        // First, try to login as admin
        console.log('1. Testing admin login...');
        const loginResponse = await axios.post(`${baseURL}/api/admin/login`, {
            username: 'admin',
            password: 'admin123'
        });

        console.log('Login response:', loginResponse.data);

        if (loginResponse.data.token) {
            const token = loginResponse.data.token;

            // Test stats endpoint
            console.log('2. Testing admin stats...');
            const statsResponse = await axios.get(`${baseURL}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Stats response:', statsResponse.data);

            // Test subscriptions endpoint
            console.log('3. Testing admin subscriptions...');
            const subsResponse = await axios.get(`${baseURL}/api/admin/subscriptions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Subscriptions response:', subsResponse.data);
        }

    } catch (error) {
        console.error('Error testing admin endpoints:', error.response ? error.response.data : error.message);
    }
}

testAdminEndpoints();
