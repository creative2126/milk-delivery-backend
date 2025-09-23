const fetch = require('node-fetch');

async function testLogin() {
    const loginData = {
        username: 's@gmail.com',
        password: 'password123' // Assuming this is the password for s@gmail.com
    };

    console.log('Testing login for user:', loginData.username);

    try {
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', result);

        if (response.ok && (result.success || result.message === 'Login successful')) {
            console.log('Login successful!');
            console.log('User data:', result.user);
        } else {
            console.log('Login failed:', result.error || result.message);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
