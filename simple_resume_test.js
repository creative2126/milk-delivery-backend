const axios = require('axios');

async function simpleResumeTest() {
    try {
        console.log('Testing resume functionality...');

        // Check if server is running
        try {
            const response = await axios.get('http://localhost:3000/api/subscriptions');
            console.log('Server is running. Found', response.data.length, 'subscriptions');

            // Look for paused subscriptions
            const pausedSubs = response.data.filter(sub => sub.subscription_status === 'paused');
            console.log('Found', pausedSubs.length, 'paused subscriptions');

            if (pausedSubs.length > 0) {
                const testSub = pausedSubs[0];
                console.log('Testing with subscription:', testSub.username, 'ID:', testSub.id);

                // Test resume
                const resumeResponse = await axios.put(`http://localhost:3000/api/subscriptions/${testSub.id}/resume`, {
                    username: testSub.username
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

        } catch (serverError) {
            console.log('Server not responding:', serverError.message);
        }

    } catch (error) {
        console.error('Test error:', error.response ? error.response.data : error.message);
    }
}

simpleResumeTest();
