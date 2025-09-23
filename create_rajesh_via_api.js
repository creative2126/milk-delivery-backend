const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function createRajeshUser() {
    console.log('Creating user rajesh via API...');

    try {
        const userData = {
            username: 'rajesh',
            password: 'password123',
            email: 'rajesh@example.com',
            name: 'Rajesh Kumar',
            phone: '9876543210'
        };

        const response = await axios.post(`${API_BASE}/users`, userData);
        console.log('✅ User created successfully:', response.data);

    } catch (error) {
        console.error('❌ Failed to create user:', error.response?.data || error.message);
    }
}

createRajeshUser();
