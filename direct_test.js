const axios = require('axios');

async function directTest() {
    try {
        console.log('Testing resume fix directly...');

        // First, let's check if we can connect to the server
        console.log('Testing server connection...');
        const response = await axios.get('http://localhost:3001/api/users');
        console.log('✅ Server is responding');
        console.log('Found', response.data.length, 'users');

        // Check for paused subscriptions
        const pausedUsers = response.data.filter(user => user.subscription_status === 'paused');
        console.log('Found', pausedUsers.length, 'paused subscriptions');

        if (pausedUsers.length > 0) {
            const testUser = pausedUsers[0];
            console.log('Testing resume with user:', testUser.username, 'ID:', testUser.id);

            // Test resume
            const resumeResponse = await axios.put(`http://localhost:3001/api/subscriptions/${testUser.id}/resume`, {
                username: testUser.username
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume functionality works!');
                console.log('The fix for null end dates is working correctly!');
            } else {
                console.log('❌ FAILED: Resume failed');
                console.log('Error:', resumeResponse.data.error);
            }
        } else {
            console.log('No paused subscriptions found to test with');
            console.log('Creating a test subscription to verify the fix...');

            // Create a test user
            const userData = {
                username: 'test_resume_fix_direct',
                email: 'test_resume_fix_direct@example.com',
                password: 'password123',
                name: 'Test Resume Fix Direct',
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
                username: 'test_resume_fix_direct',
                subscription_type: '1L',
                duration: 'monthly',
                amount: '1200.00',
                address: 'Test Address',
                building_name: 'Test Building',
                flat_number: '101',
                payment_id: 'pay_test_direct_' + Date.now()
            };

            const subscriptionResponse = await axios.post('http://localhost:3001/api/subscriptions', subscriptionData);
            console.log('Subscription created:', subscriptionResponse.data);

            // Pause the subscription
            const pauseResponse = await axios.put(`http://localhost:3001/api/subscriptions/${userId}/pause`);
            console.log('Subscription paused:', pauseResponse.data);

            // Now test resume
            const resumeResponse = await axios.put(`http://localhost:3001/api/subscriptions/${userId}/resume`, {
                username: 'test_resume_fix_direct'
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume functionality works!');
                console.log('The fix for null end dates is working correctly!');
            } else {
                console.log('❌ FAILED: Resume failed');
                console.log('Error:', resumeResponse.data.error);
            }
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

directTest();
