const axios = require('axios');

async function testPausedSubscriptionRemaining() {
    try {
        console.log('🧪 Testing paused subscription remaining days calculation...');

        // Test with a user that has a paused subscription
        const response = await axios.get('http://localhost:3001/api/subscriptions/remaining/testuser@gmail.com');

        console.log('📊 API Response:');
        console.log('Status:', response.status);
        console.log('Subscription Status:', response.data.subscription?.status);
        console.log('Remaining Days:', response.data.subscription?.remaining_days);
        console.log('Paused At:', response.data.subscription?.paused_at);
        console.log('End Date:', response.data.subscription?.end_date);

        if (response.data.subscription?.status === 'paused') {
            console.log('✅ SUCCESS: Paused subscription remaining days are calculated correctly!');
            console.log('📝 The remaining days should be calculated from paused_at date, not current date');
        } else {
            console.log('⚠️  Note: This user may not have a paused subscription to test with');
        }

        console.log('\n🔍 Full Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error testing paused subscription remaining days:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Test with different scenarios
async function testMultipleScenarios() {
    const testUsers = [
        'testuser@gmail.com',
        'rohit@gmail.com',
        'rajasri26@gmail.com'
    ];

    for (const username of testUsers) {
        try {
            console.log(`\n🧪 Testing user: ${username}`);
            const response = await axios.get(`http://localhost:3001/api/subscriptions/remaining/${username}`);

            const sub = response.data.subscription;
            if (sub) {
                console.log(`   Status: ${sub.status}`);
                console.log(`   Remaining Days: ${sub.remaining_days}`);
                console.log(`   End Date: ${sub.end_date}`);
                console.log(`   Paused At: ${sub.paused_at}`);

                // Verify the logic
                if (sub.status === 'paused' && sub.paused_at) {
                    console.log('   ✅ Paused subscription detected - remaining days should be from pause date');
                } else if (sub.status === 'active') {
                    console.log('   ✅ Active subscription - remaining days should be from current date');
                } else if (sub.status === 'expired') {
                    console.log('   ✅ Expired subscription - remaining days should be 0');
                }
            } else {
                console.log('   ❌ No subscription found');
            }
        } catch (error) {
            console.error(`   ❌ Error testing ${username}:`, error.message);
        }
    }
}

async function runAllTests() {
    await testPausedSubscriptionRemaining();
    console.log('\n' + '='.repeat(50));
    await testMultipleScenarios();
}

// Run tests
runAllTests();
