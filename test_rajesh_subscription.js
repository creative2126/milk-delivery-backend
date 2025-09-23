const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testRajeshSubscription() {
    console.log('Testing subscription creation with name field lookup for Rajesh...');

    try {
        // Test data using the name field as username (simulating the bug scenario)
        const testData = {
            username: 'Rajesh Kumar', // This is the name field, not username
            subscription_type: '1L Daily',
            duration: '7days',
            amount: '100.00',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101',
            payment_id: 'pay_test_rajesh_' + Date.now()
        };

        console.log('Testing subscription creation with username parameter:', testData.username);
        console.log('This should find user by name field since username is "rajesh" and name is "Rajesh Kumar"');

        // Create subscription
        const createResponse = await axios.post(`${API_BASE}/subscriptions`, testData);
        console.log('✅ SUCCESS: Subscription creation response:', createResponse.status);
        console.log('Subscription data:', createResponse.data);

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);

        if (error.response?.status === 404 && error.response?.data?.error === 'User not found') {
            console.log('❌ FAILURE: User lookup still failing - the fix did not work');
        } else if (error.response?.status === 400 && error.response?.data?.error === 'Active subscription exists') {
            console.log('✅ SUCCESS: User was found (but already has active subscription)');
        } else {
            console.log('❌ FAILURE: Unexpected error');
        }
    }
}

testRajeshSubscription();
