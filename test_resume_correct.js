const axios = require('axios');

async function testResumeCorrect() {
    try {
        console.log('Testing resume functionality with correct endpoints...');

        // First, let's check if we can get users
        console.log('Testing /api/profile endpoint...');
        const profileResponse = await axios.get('http://localhost:3001/api/profile?username=testuser');
        console.log('Profile response:', profileResponse.data);

        // Check for paused subscriptions
        const pausedUsers = profileResponse.data.user ? [profileResponse.data.user] : [];
        const pausedUser = pausedUsers.find(user => user.subscription_status === 'paused');

        if (pausedUser) {
            console.log('Found paused subscription for user:', pausedUser.username);

            // Test resume
            const resumeResponse = await axios.put(`http://localhost:3001/api/subscriptions/${pausedUser.id}/resume`, {
                username: pausedUser.username
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume functionality works!');
                console.log('The fix for null end dates is working correctly!');
            } else {
                console.log('❌ FAILED: Resume failed');
                console.log('Error:', resumeResponse.data.message);
            }
        } else {
            console.log('No paused subscriptions found to test with');
            console.log('Creating a test subscription to verify the fix...');

            // Create a test user
            const userData = {
                username: 'test_resume_fix_' + Date.now(),
                email: 'test_resume_fix_' + Date.now() + '@example.com',
                password: 'password123',
                name: 'Test Resume Fix',
                phone: '1234567890',
                address: 'Test Address',
                building_name: 'Test Building',
                flat_number: '101'
            };

            const userResponse = await axios.post('http://localhost:3001/api/users', userData);
            console.log('User created:', userResponse.data);

            const userId = userResponse.data.id;

            // Create subscription
            const subscriptionData = {
                username: userData.username,
                subscription_type: '1L',
                duration: 'monthly',
                amount: '1200.00',
                address: 'Test Address',
                building_name: 'Test Building',
                flat_number: '101',
                payment_id: 'pay_test_' + Date.now()
            };

            const subscriptionResponse = await axios.post('http://localhost:3001/api/subscriptions', subscriptionData);
            console.log('Subscription created:', subscriptionResponse.data);

            // Pause the subscription
            const pauseResponse = await axios.put(`http://localhost:3001/api/subscriptions/${userId}/pause`, {
                username: userData.username
            });
            console.log('Subscription paused:', pauseResponse.data);

            // Now test resume
            const resumeResponse = await axios.put(`http://localhost:3001/api/subscriptions/${userId}/resume`, {
                username: userData.username
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume functionality works!');
                console.log('The fix for null end dates is working correctly!');
            } else {
                console.log('❌ FAILED: Resume failed');
                console.log('Error:', resumeResponse.data.message);
            }
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testResumeCorrect();
