// Test script for pause and resume functionality with test user
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testPauseResumeTestUser() {
    console.log('🧪 Testing Pause/Resume Subscription Endpoints with Test User\n');

    try {
        const username = 'testuser@gmail.com';
        const subscriptionId = 999;

        console.log(`Testing with user: ${username}`);
        console.log(`Using subscription ID: ${subscriptionId}\n`);

        // First, check the current status of the test user subscription
        console.log('1. Checking current subscription status...');
        const statusResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/${username}`);
        const statusData = await statusResponse.json();
        console.log('Current subscription status:', JSON.stringify(statusData, null, 2));

        if (!statusData.subscription) {
            console.log('❌ No subscription found for test user');
            return;
        }

        const currentStatus = statusData.subscription.status;
        console.log(`Current status: ${currentStatus}\n`);

        // Test appropriate action based on current status
        if (currentStatus === 'active') {
            console.log('2. Testing PAUSE endpoint...');
            const pauseResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/pause`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });

            const pauseResult = await pauseResponse.json();
            console.log('Pause Response Status:', pauseResponse.status);
            console.log('Pause Response:', JSON.stringify(pauseResult, null, 2));

            if (pauseResult.success) {
                console.log('✅ Pause successful!\n');

                // Check status after pause
                console.log('3. Checking status after pause...');
                const afterPauseResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/${username}`);
                const afterPauseData = await afterPauseResponse.json();
                console.log('Status after pause:', JSON.stringify(afterPauseData.subscription, null, 2));

                // Now test resume
                console.log('\n4. Testing RESUME endpoint...');
                const resumeResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/resume`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });

                const resumeResult = await resumeResponse.json();
                console.log('Resume Response Status:', resumeResponse.status);
                console.log('Resume Response:', JSON.stringify(resumeResult, null, 2));

                if (resumeResult.success) {
                    console.log('✅ Resume successful!\n');

                    // Check final status
                    console.log('5. Checking final status after resume...');
                    const finalResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/${username}`);
                    const finalData = await finalResponse.json();
                    console.log('Final status:', JSON.stringify(finalData.subscription, null, 2));
                } else {
                    console.log('❌ Resume failed:', resumeResult.message);
                }
            } else {
                console.log('❌ Pause failed:', pauseResult.message);
                return;
            }
        } else if (currentStatus === 'paused') {
            console.log('2. Testing RESUME endpoint...');
            const resumeResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/resume`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });

            const resumeResult = await resumeResponse.json();
            console.log('Resume Response Status:', resumeResponse.status);
            console.log('Resume Response:', JSON.stringify(resumeResult, null, 2));

            if (resumeResult.success) {
                console.log('✅ Resume successful!\n');

                // Check status after resume
                console.log('3. Checking status after resume...');
                const afterResumeResponse = await fetch(`${BASE_URL}/api/subscriptions/remaining/${username}`);
                const afterResumeData = await afterResumeResponse.json();
                console.log('Status after resume:', JSON.stringify(afterResumeData.subscription, null, 2));
            } else {
                console.log('❌ Resume failed:', resumeResult.message);
            }
        } else {
            console.log(`❌ Subscription status is ${currentStatus}, cannot test pause/resume`);
        }

        console.log('\n🎉 Pause/Resume test with test user completed!');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testPauseResumeTestUser();
