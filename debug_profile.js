const axios = require('axios');

async function debugProfile() {
    try {
        console.log('Debugging profile response...');

        const profileResponse = await axios.get('http://localhost:3001/api/profile?username=testuser');
        console.log('Full profile response:');
        console.log(JSON.stringify(profileResponse.data, null, 2));

        console.log('\nProfile response structure:');
        console.log('Type of data:', typeof profileResponse.data);
        console.log('Keys in data:', Object.keys(profileResponse.data));

        if (profileResponse.data.user) {
            console.log('User object exists');
            console.log('User keys:', Object.keys(profileResponse.data.user));
            console.log('User ID:', profileResponse.data.user.id);
        } else {
            console.log('No user object found');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

debugProfile();
