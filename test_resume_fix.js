const axios = require('axios');

async function testResumeFix() {
    try {
        console.log('Testing resume fix for null end dates...');

        // First, let's check what users exist with paused subscriptions
        console.log('Checking existing users...');
        const usersResponse = await axios.get('http://localhost:3000/api/subscriptions');
        console.log('Existing subscriptions:', usersResponse.data);

        // Look for a paused subscription
        const pausedSubscription = usersResponse.data.find(sub => sub.subscription_status === 'paused');

        if (!pausedSubscription) {
            console.log('No paused subscriptions found. Creating one...');

            // Create a test user first
            const userData = {
                username: 'test_resume_fix',
                email: 'test_resume_fix@example.com',
                password: 'password123',
                name: 'Test Resume Fix',
                phone: '1234567890',
                address: 'Test Address',
                building_name: 'Test Building',
                flat_number: '101'
            };

            const userResponse = await axios.post('http://localhost:3000/api/users', userData);
            console.log('User created:', userResponse.data);

            const userId = userResponse.data.id;

            // Create subscription
            const subscriptionData = {
                username: 'test_resume_fix',
                subscription_type: '1L',
                duration: 'monthly',
                amount: '1200.00',
                address: 'Test Address',
                building_name: 'Test Building',
                flat_number: '101',
                payment_id: 'pay_test_resume_' + Date.now()
            };

            const subscriptionResponse = await axios.post('http://localhost:3000/api/subscriptions', subscriptionData);
            console.log('Subscription created:', subscriptionResponse.data);

            // Pause the subscription
            const pauseResponse = await axios.put(`http://localhost:3000/api/subscriptions/${userId}/pause`);
            console.log('Subscription paused:', pauseResponse.data);

            // Now test resume
            const resumeResponse = await axios.put(`http://localhost:3000/api/subscriptions/${userId}/resume`, {
                username: 'test_resume_fix'
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume fix works correctly!');
            } else {
                console.log('❌ FAILED: Resume fix failed');
                console.log('Error:', resumeResponse.data);
            }

        } else {
            console.log('Found paused subscription:', pausedSubscription);

            // Test resume on existing paused subscription
            const resumeResponse = await axios.put(`http://localhost:3000/api/subscriptions/${pausedSubscription.id}/resume`, {
                username: pausedSubscription.username
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume fix works correctly!');
            } else {
                console.log('❌ FAILED: Resume fix failed');
                console.log('Error:', resumeResponse.data);
            }
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testResumeFix();
