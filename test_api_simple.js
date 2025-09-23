const axios = require('axios');

async function testAPI() {
    try {
        console.log('Testing API endpoints...');

        // Test basic connectivity
        const response = await axios.get('http://localhost:3000/api/users');
        console.log('✅ Server is responding');
        console.log('Found', response.data.length, 'users');

        // Check for paused subscriptions
        const pausedUsers = response.data.filter(user => user.subscription_status === 'paused');
        console.log('Found', pausedUsers.length, 'paused subscriptions');

        if (pausedUsers.length > 0) {
            const testUser = pausedUsers[0];
            console.log('Testing resume with user:', testUser.username);

            // Test resume
            const resumeResponse = await axios.put(`http://localhost:3000/api/subscriptions/${testUser.id}/resume`, {
                username: testUser.username
            });

            console.log('Resume response:', resumeResponse.data);

            if (resumeResponse.data.success) {
                console.log('✅ SUCCESS: Resume functionality works!');
            } else {
                console.log('❌ FAILED: Resume failed');
                console.log('Error:', resumeResponse.data.error);
            }
        } else {
            console.log('No paused subscriptions found to test with');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testAPI();
