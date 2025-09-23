const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testSubscriptionCreation() {
    console.log('Testing subscription creation and cache invalidation...');

    try {
        // Test data
        const testUser = {
            username: 's@gmail.com',
            subscription_type: '1L Daily',
            duration: '7days',
            amount: '100.00',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101',
            payment_id: 'pay_test_' + Date.now()
        };

        console.log('1. Checking initial subscriptions for user:', testUser.username);

        // Check initial subscriptions
        const initialResponse = await axios.get(`${API_BASE}/subscriptions/remaining/${testUser.username}`);
        console.log('Initial subscriptions:', initialResponse.data);

        console.log('2. Creating new subscription...');

        // Create subscription
        const createResponse = await axios.post(`${API_BASE}/subscriptions`, testUser);
        console.log('Subscription creation response:', createResponse.status, createResponse.data);

        if (createResponse.status === 201) {
            console.log('3. Checking subscriptions after creation...');

            // Check subscriptions after creation
            const afterResponse = await axios.get(`${API_BASE}/subscriptions/remaining/${testUser.username}`);
            console.log('Subscriptions after creation:', afterResponse.data);

            // Verify the new subscription is present
            const hasActiveSubscription = afterResponse.data.some(sub =>
                sub.status === 'active' && sub.subscription_type === testUser.subscription_type
            );

            if (hasActiveSubscription) {
                console.log('✅ SUCCESS: New subscription is immediately visible');
            } else {
                console.log('❌ FAILURE: New subscription not found in response');
            }
        } else {
            console.log('❌ FAILURE: Subscription creation failed');
        }

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testSubscriptionCreation();
