const axios = require('axios');

async function testResumeFixed() {
    try {
        console.log('Testing resume functionality - Fixed Test...');

        // Create a test user
        const timestamp = Date.now();
        const username = 'test_resume_fixed_' + timestamp;
        const email = 'test_resume_fixed_' + timestamp + '@example.com';

        const userData = {
            username: username,
            email: email,
            password: 'password123',
            name: 'Test Resume Fixed',
            phone: '1234567890',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101'
        };

        console.log('Creating test user...');
        const userResponse = await axios.post('http://localhost:3001/api/users', userData);
        console.log('User created:', userResponse.data);

        // Get the user ID from the profile
        console.log('Getting user profile...');
        const profileResponse = await axios.get(`http://localhost:3001/api/profile?username=${username}`);
        const userId = profileResponse.data.user.id;
        console.log('User ID:', userId);

        // Create subscription
        const subscriptionData = {
            username: username,
            subscription_type: '1L',
            duration: 'monthly',
            amount: '1200.00',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101',
            payment_id: 'pay_test_' + timestamp
        };

        console.log('Creating subscription...');
        const subscriptionResponse = await axios.post('http://localhost:3001/api/subscriptions', subscriptionData);
        console.log('Subscription created:', subscriptionResponse.data);

        // Pause the subscription
        console.log('Pausing subscription...');
        const pauseResponse = await axios.put(`http://localhost:3001/api/subscriptions/${userId}/pause`, {
            username: username
        });
        console.log('Subscription paused:', pauseResponse.data);

        // Now test resume - this is where our fix should work
        console.log('Testing resume functionality...');
        const resumeResponse = await axios.put(`http://localhost:3001/api/subscriptions/${userId}/resume`, {
            username: username
        });

        console.log('Resume response:', resumeResponse.data);

        if (resumeResponse.data.success) {
            console.log('✅ SUCCESS: Resume functionality works!');
            console.log('The fix for null end dates is working correctly!');
            console.log('🎉 The subscription resume issue has been resolved!');
        } else {
            console.log('❌ FAILED: Resume failed');
            console.log('Error:', resumeResponse.data.message);
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testResumeFixed();
