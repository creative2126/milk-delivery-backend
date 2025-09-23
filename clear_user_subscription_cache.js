const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function clearUserSubscriptionCache(username) {
    try {
        console.log(`Clearing subscription cache for user: ${username}`);

        // This would require a new API endpoint to clear cache, but for now we can suggest restarting the server
        console.log('To clear cache, you can:');
        console.log('1. Restart the backend server');
        console.log('2. Or add a cache clearing endpoint');

        // Alternatively, we can try to trigger cache invalidation by making a request that would invalidate it
        console.log('Attempting to trigger cache invalidation by checking subscriptions...');

        const response = await axios.get(`${API_BASE}/subscriptions/remaining/${username}`);
        console.log('Cache status:', response.data.cache ? 'cached' : 'fresh');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Usage: node clear_user_subscription_cache.js <username>
const username = process.argv[2];
if (!username) {
    console.log('Usage: node clear_user_subscription_cache.js <username>');
    process.exit(1);
}

clearUserSubscriptionCache(username);
