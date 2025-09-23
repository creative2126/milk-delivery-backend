const fetch = require('node-fetch');

async function testPause() {
  try {
    console.log('Testing pause API for subscription 26...');
    const response = await fetch('http://localhost:3001/api/subscriptions/26/pause', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'rohit@gmail.com' })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    const result = await response.json();
    console.log('Response body:', result);
  } catch (error) {
    console.error('Network error:', error);
  }
}

testPause();
