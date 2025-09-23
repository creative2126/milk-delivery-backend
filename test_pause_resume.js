// Test script for pause and resume functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testPauseResume() {
    console.log('🧪 Testing Pause/Resume Subscription Endpoints\n');

    try {
        // First, let's get a subscription to test with
        console.log('1. Fetching existing subscriptions...');
        const subscriptionsResponse = await fetch(`${BASE_URL}/api/subscriptions`);
        const subscriptions = await subscriptionsResponse.json();

        if (!subscriptions || (Array.isArray(subscriptions) && subscriptions.length === 0)) {
            console.log('❌ No subscriptions found to test with');
            console.log('Response:', subscriptions);
            return;
        }

        // Handle different response formats
        let subsArray = [];
        if (Array.isArray(subscriptions)) {
            subsArray = subscriptions;
        } else if (subscriptions && typeof subscriptions === 'object') {
            // If it's an object with a data property or similar
            subsArray = subscriptions.data || subscriptions.subscriptions || [subscriptions];
        }

        if (subsArray.length === 0) {
            console.log('❌ No subscriptions found to test with');
            console.log('Response:', subscriptions);
            return;
        }

        // Use the known subscription ID 24
        const subscriptionId = 24;
        console.log(`✅ Using subscription ID: ${subscriptionId}`);

        // First, check the current status of the subscription
        console.log('\n2. Checking current subscription status...');
        const statusResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/s@gmail.com`);
        const statusData = await statusResponse.json();
        console.log('Current subscription status:', statusData);

        if (!statusData.subscription) {
            console.log('❌ No subscription found');
            return;
        }

        const currentStatus = statusData.subscription.status;
        console.log(`Current status: ${currentStatus}`);

        // Test appropriate action based on current status
        if (currentStatus === 'active') {
            console.log('\n3. Testing PAUSE endpoint...');
            const pauseResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/pause`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            const pauseResult = await pauseResponse.json();
            console.log('Pause Response:', pauseResult);

            if (pauseResult.success) {
                console.log('✅ Pause successful!');

                // Check status after pause
                console.log('\n4. Checking status after pause...');
                const afterPauseResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/s@gmail.com`);
                const afterPauseData = await afterPauseResponse.json();
                console.log('Status after pause:', afterPauseData.subscription?.status);

                // Now test resume
                console.log('\n5. Testing RESUME endpoint...');
                const resumeResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/resume`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                });

                const resumeResult = await resumeResponse.json();
                console.log('Resume Response:', resumeResult);

                if (resumeResult.success) {
                    console.log('✅ Resume successful!');

                    // Check final status
                    console.log('\n6. Checking final status after resume...');
                    const finalResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/s@gmail.com`);
                    const finalData = await finalResponse.json();
                    console.log('Final status:', finalData.subscription?.status);
                } else {
                    console.log('❌ Resume failed:', resumeResult.error);
                }
            } else {
                console.log('❌ Pause failed:', pauseResult.error);
                return;
            }
        } else if (currentStatus === 'paused') {
            console.log('\n3. Testing RESUME endpoint...');
            const resumeResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/resume`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            const resumeResult = await resumeResponse.json();
            console.log('Resume Response:', resumeResult);

            if (resumeResult.success) {
                console.log('✅ Resume successful!');

                // Check status after resume
                console.log('\n4. Checking status after resume...');
                const afterResumeResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/s@gmail.com`);
                const afterResumeData = await afterResumeResponse.json();
                console.log('Status after resume:', afterResumeData.subscription?.status);
            } else {
                console.log('❌ Resume failed:', resumeResult.error);
            }
        } else {
            console.log(`❌ Subscription status is ${currentStatus}, cannot test pause/resume`);
        }

        console.log('\n🎉 Pause/Resume test completed!');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testPauseResume();
