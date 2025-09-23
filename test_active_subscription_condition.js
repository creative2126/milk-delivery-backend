const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testActiveSubscriptionCondition() {
    console.log('Testing active subscription condition: only one subscription per user...');

    try {
        // Test data
        const testUser = {
            username: 'testuser@example.com',
            subscription_type: '1L Daily',
            duration: '7days',
            amount: '100.00',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101'
        };

        console.log('1. Checking initial subscriptions for user:', testUser.username);

        // Check initial subscriptions
        const initialResponse = await axios.get(`${API_BASE}/subscriptions/remaining/${testUser.username}`);
        console.log('Initial subscriptions:', initialResponse.data);

        console.log('2. Creating first subscription...');

        // Create first subscription
        const firstPaymentId = 'pay_test_first_' + Date.now();
        const firstSubscriptionData = { ...testUser, payment_id: firstPaymentId };

        try {
            const firstCreateResponse = await axios.post(`${API_BASE}/subscriptions`, firstSubscriptionData);
            console.log('First subscription creation response:', firstCreateResponse.status, firstCreateResponse.data);

            if (firstCreateResponse.status === 201) {
                console.log('✅ First subscription created successfully');

                console.log('3. Attempting to create second subscription while first is active...');

                // Try to create second subscription
                const secondPaymentId = 'pay_test_second_' + Date.now();
                const secondSubscriptionData = { ...testUser, payment_id: secondPaymentId };

                try {
                    const secondCreateResponse = await axios.post(`${API_BASE}/subscriptions`, secondSubscriptionData);
                    console.log('❌ FAILURE: Second subscription creation should have failed but succeeded');
                    console.log('Second subscription response:', secondCreateResponse.status, secondCreateResponse.data);
                } catch (secondError) {
                    if (secondError.response && secondError.response.status === 400) {
                        const errorData = secondError.response.data;
                        if (errorData.code === 1007) {
                            console.log('✅ SUCCESS: Second subscription creation correctly blocked');
                            console.log('Error message:', errorData.message);
                        } else {
                            console.log('❌ FAILURE: Wrong error code received:', errorData.code);
                            console.log('Error:', errorData);
                        }
                    } else {
                        console.log('❌ FAILURE: Unexpected error for second subscription:', secondError.response?.data || secondError.message);
                    }
                }

                console.log('4. Checking subscriptions after test...');

                // Check final subscriptions
                const finalResponse = await axios.get(`${API_BASE}/subscriptions/remaining/${testUser.username}`);
                console.log('Final subscriptions:', finalResponse.data);

            } else {
                console.log('❌ FAILURE: First subscription creation failed');
            }
        } catch (firstError) {
            console.log('❌ FAILURE: First subscription creation error:', firstError.response?.data || firstError.message);
        }

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testActiveSubscriptionCondition();
