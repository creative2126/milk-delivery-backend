// Test script to verify subscription resume fix with correct endpoints
const API_BASE = 'https://milk-delivery-backend.onrender.com/api/subscriptions';

// Test subscription #34 resume functionality
async function testSubscriptionResume() {
    console.log('Testing subscription resume fix...');

    try {
        // First, let's check what subscription #34 looks like
        console.log('Checking subscription #34 details...');
        const checkResponse = await fetch(`${API_BASE}/subscriptions/34`);
        const subscriptionData = await checkResponse.json();

        console.log('Subscription #34 data:', subscriptionData);

        // Now try to resume it
        console.log('Attempting to resume subscription #34...');
        const resumeResponse = await fetch(`${API_BASE}/34/resume`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'gill' // Use the correct username from subscription data
            })
        });

        console.log('Resume response status:', resumeResponse.status);

        const resumeData = await resumeResponse.json();
        console.log('Resume response data:', resumeData);

        if (resumeResponse.ok) {
            console.log('✅ SUCCESS: Subscription #34 resumed successfully!');
            console.log('Response:', resumeData);
        } else {
            console.log('❌ FAILED: Subscription resume failed');
            console.log('Error details:', resumeData);
        }

    } catch (error) {
        console.error('❌ ERROR: Test failed with exception:', error);
    }
}

// Run the test
testSubscriptionResume();
