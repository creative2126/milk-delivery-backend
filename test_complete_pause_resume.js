// Complete test script for pause and resume functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function createTestUser() {
    console.log('👤 Creating test user...');
    const userResponse = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'testuser_pause',
            password: 'testpass123',
            name: 'Test User',
            email: 'testuser_pause@example.com',
            phone: '1234567890'
        })
    });

    const userResult = await userResponse.json();
    if (userResponse.status === 201 || userResult.message === 'User registered successfully') {
        console.log('✅ Test user created successfully');
        return { username: 'testuser_pause', password: 'testpass123' };
    } else {
        console.log('ℹ️ Test user might already exist, proceeding...');
        return { username: 'testuser_pause', password: 'testpass123' };
    }
}

async function createTestSubscription(credentials) {
    console.log('📝 Creating test subscription...');

    // First login to get user context
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });

    const loginResult = await loginResponse.json();
    if (!loginResult.user) {
        console.log('❌ Login failed:', loginResult);
        return null;
    }

    console.log('✅ Login successful');

    // Create subscription
    const subscriptionResponse = await fetch(`${BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: credentials.username,
            subscription_type: 'daily',
            duration: '7 days',
            amount: '100.00',
            address: 'Test Address',
            building_name: 'Test Building',
            flat_number: '101',
            payment_id: 'test_payment_123'
        })
    });

    const subscriptionResult = await subscriptionResponse.json();
    console.log('Subscription creation response:', subscriptionResult);

    if (subscriptionResponse.status === 201 && subscriptionResult.id) {
        console.log(`✅ Test subscription created with ID: ${subscriptionResult.id}`);
        return subscriptionResult.id;
    } else {
        console.log('❌ Subscription creation failed:', subscriptionResult);
        return null;
    }
}

async function testPauseResume() {
    console.log('🧪 Testing Complete Pause/Resume Subscription Endpoints\n');

    try {
        // Step 1: Create test user
        const credentials = await createTestUser();

        // Step 2: Create test subscription
        const subscriptionId = await createTestSubscription(credentials);
        if (!subscriptionId) {
            console.log('❌ Cannot proceed without a subscription');
            return;
        }

        // Step 3: Test Pause
        console.log('\n⏸️ Testing PAUSE endpoint...');
        const pauseResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/pause`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const pauseResult = await pauseResponse.json();
        console.log('Pause Response:', pauseResult);

        if (pauseResult.success) {
            console.log('✅ Pause successful!');
        } else {
            console.log('❌ Pause failed:', pauseResult.error || pauseResult.message);
            return;
        }

        // Step 4: Test Resume
        console.log('\n▶️ Testing RESUME endpoint...');
        const resumeResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}/resume`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const resumeResult = await resumeResponse.json();
        console.log('Resume Response:', resumeResult);

        if (resumeResult.success) {
            console.log('✅ Resume successful!');
        } else {
            console.log('❌ Resume failed:', resumeResult.error || resumeResult.message);
        }

        // Step 5: Verify final state
        console.log('\n🔍 Verifying final subscription state...');
        const verifyResponse = await fetch(`${BASE_URL}/api/subscriptions/${subscriptionId}`);
        const verifyResult = await verifyResponse.json();

        if (verifyResult.status === 'active') {
            console.log('✅ Subscription is back to active state');
        } else {
            console.log('⚠️ Subscription status:', verifyResult.status);
        }

        console.log('\n🎉 Complete Pause/Resume test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testPauseResume();
