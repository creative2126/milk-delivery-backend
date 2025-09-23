// Check all subscriptions to see what's available
const API_BASE = 'https://milk-delivery-backend.onrender.com/api/subscriptions';

async function checkAllSubscriptions() {
    console.log('Checking all subscriptions...');

    try {
        // Check all subscriptions
        const response = await fetch(`${API_BASE}/subscriptions`);
        const subscriptionsData = await response.json();

        console.log('All subscriptions data:', JSON.stringify(subscriptionsData, null, 2));

        // Check if subscription 34 exists
        const subscription34 = subscriptionsData.find(sub => sub.id === 34);
        console.log('Subscription #34 found:', subscription34 ? 'YES' : 'NO');

        if (subscription34) {
            console.log('Subscription #34 details:', JSON.stringify(subscription34, null, 2));
        }

    } catch (error) {
        console.error('Error checking subscriptions:', error);
    }
}

checkAllSubscriptions();
