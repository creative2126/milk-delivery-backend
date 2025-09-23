const axios = require('axios');

async function testExpiredUser() {
    try {
        console.log('Testing subscription API for user with expired subscription: expired_user');
        const response = await axios.get('http://localhost:3001/api/subscriptions/remaining/expired_user');
        console.log('Subscription Remaining API Response:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error calling subscription remaining API:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testExpiredUser();
