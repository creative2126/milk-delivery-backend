// Debug subscription #34 details
const API_BASE = 'https://milk-delivery-backend.onrender.com/api';

async function debugSubscription34() {
    console.log('🔍 Debugging subscription #34 details...');

    try {
        // First, let's check what user is trying to resume subscription #34
        console.log('\n1. Checking profile for subscription #34...');
        const profileResponse = await fetch(`${API_BASE}/profile?username=34`);
        const profileData = await profileResponse.json();
        console.log('Profile data:', JSON.stringify(profileData, null, 2));

        // Check subscription remaining for user 34
        console.log('\n2. Checking subscription remaining for user 34...');
        const remainingResponse = await fetch(`${API_BASE}/subscriptions/remaining/34`);
        const remainingData = await remainingResponse.json();
        console.log('Remaining data:', JSON.stringify(remainingData, null, 2));

        // If we have a subscription, try to resume it
        if (remainingData.subscription && remainingData.subscription.status === 'paused') {
            console.log('\n3. Attempting to resume subscription #34...');
            const resumeResponse = await fetch(`${API_BASE}/subscriptions/34/resume`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: '34' })
            });

            console.log('Resume response status:', resumeResponse.status);
            const resumeData = await resumeResponse.json();
            console.log('Resume response data:', JSON.stringify(resumeData, null, 2));
        } else {
            console.log('\n3. Subscription is not in paused state, cannot resume');
        }

    } catch (error) {
        console.error('Error debugging subscription:', error);
    }
}

debugSubscription34();
