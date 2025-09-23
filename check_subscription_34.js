// Check subscription #34 details
const API_BASE = 'https://milk-delivery-backend.onrender.com/api/subscriptions';

async function checkSubscription34() {
    console.log('Checking subscription #34 details...');

    try {
        // Check subscription details
        const response = await fetch(`${API_BASE}/subscriptions/34`);
        const subscriptionData = await response.json();

        console.log('Subscription #34 data:', JSON.stringify(subscriptionData, null, 2));

        // Check remaining subscription
        const remainingResponse = await fetch(`${API_BASE}/remaining/34`);
        const remainingData = await remainingResponse.json();

        console.log('Remaining subscription data:', JSON.stringify(remainingData, null, 2));

        // Check all subscriptions for user 34
        const userSubsResponse = await fetch(`${API_BASE}/users/34/subscriptions`);
        const userSubsData = await userSubsResponse.json();

        console.log('All subscriptions for user 34:', JSON.stringify(userSubsData, null, 2));

    } catch (error) {
        console.error('Error checking subscription:', error);
    }
}

checkSubscription34();
