const axios = require('axios');

async function testHealth() {
    try {
        console.log('Testing server health...');
        const response = await axios.get('http://localhost:3001/health');
        console.log('Health check response:', response.data);
        console.log('✅ Server is healthy');
    } catch (error) {
        console.error('Health check failed:', error.response ? error.response.data : error.message);
    }
}

testHealth();
