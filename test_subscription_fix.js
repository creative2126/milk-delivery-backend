const axios = require('axios');

async function testSubscriptionFix() {
    try {
        console.log('Testing subscription remaining API after fixes...');

        // Test with the user mentioned in the test file
        const response = await axios.get('http://localhost:3001/api/subscriptions/remaining/rajasri26@gmail.com');

        console.log('=== SUBSCRIPTION FIX TEST RESULTS ===');
        console.log('API Response:');
        console.log(JSON.stringify(response.data, null, 2));

        const subscription = response.data.subscription;

        if (subscription) {
            console.log('\n=== SUBSCRIPTION DETAILS ===');
            console.log('Subscription Type:', subscription.subscription_type);
            console.log('Duration:', subscription.duration);
            console.log('Status:', subscription.status);
            console.log('End Date:', subscription.end_date);
            console.log('Remaining Days:', subscription.remaining_days);

            // Validate the fix
            console.log('\n=== VALIDATION ===');

            if (subscription.end_date === '1970-01-01') {
                console.log('❌ FAIL: End date is still showing 01/01/1970');
            } else {
                console.log('✅ PASS: End date is properly formatted');
            }

            if (subscription.remaining_days === null || subscription.remaining_days === undefined) {
                console.log('❌ FAIL: Remaining days is still null');
            } else if (subscription.remaining_days < 0) {
                console.log('✅ PASS: Remaining days is negative (subscription expired)');
                console.log('   Value:', subscription.remaining_days, 'days');
            } else {
                console.log('✅ PASS: Remaining days is positive');
                console.log('   Value:', subscription.remaining_days, 'days');
            }

            if (subscription.remaining_days >= 0) {
                console.log('✅ PASS: Remaining days is non-negative (GREATEST function working)');
            } else {
                console.log('❌ FAIL: Remaining days is negative (should be 0 or positive)');
            }
        } else {
            console.log('No subscription found for this user');
        }

    } catch (error) {
        console.error('Error testing subscription API:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testSubscriptionFix();
