const fetch = require('node-fetch');

async function testPause() {
  try {
    const response = await fetch('http://localhost:3001/api/subscriptions/26/pause', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'rohit@gmail.com' })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPause();
