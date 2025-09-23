const axios = require('axios');

async function createTestPausedSubscription() {
    try {
        console.log('Creating a test user with paused subscription...');

        // First, create a new user
        const userData = {
            username: 'test_paused_resume',
            email: 'test_paused_resume@example.com',
            password: 'password123',
            name: 'Test Paused Resume',
            phone: '1234567890',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101'
        };

        console.log('Creating user:', userData);

        const userResponse = await axios.post('http://localhost:3000/api/users', userData);
        console.log('User created:', userResponse.data);

        const userId = userResponse.data.id;

        // Create a subscription for this user
        const subscriptionData = {
            username: 'test_paused_resume',
            subscription_type: '1L',
            duration: 'monthly',
            amount: '1200.00',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101',
            payment_id: 'pay_test_' + Date.now()
        };

        console.log('Creating subscription:', subscriptionData);

        const subscriptionResponse = await axios.post('http://localhost:3000/api/subscriptions', subscriptionData);
        console.log('Subscription created:', subscriptionResponse.data);

        // Pause the subscription
        console.log('Pausing subscription...');
        const pauseResponse = await axios.put(`http://localhost:3000/api/subscriptions/${userId}/pause`);
        console.log('Subscription paused:', pauseResponse.data);

        // Check the subscription status
        console.log('Checking subscription status...');
        const statusResponse = await axios.get(`http://localhost:3000/api/subscriptions/${userId}`);
        console.log('Subscription status:', statusResponse.data);

        // Now test the resume functionality
        console.log('Testing resume functionality...');
        const resumeResponse = await axios.put(`http://localhost:3000/api/subscriptions/${userId}/resume`, {
            username: 'test_paused_resume'
        });

        console.log('Resume response:', resumeResponse.data);

        if (resumeResponse.data.success) {
            console.log('✅ SUCCESS: Subscription resumed successfully!');
        } else {
            console.log('❌ FAILED: Subscription resume failed');
            console.log('Error:', resumeResponse.data);
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

createTestPausedSubscription();
