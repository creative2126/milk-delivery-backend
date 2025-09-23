const http = require('http');

// Test the admin subscriptions endpoint
async function testAdminEndpoint() {
  console.log('=== Testing Admin Subscriptions Endpoint ===\n');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/subscriptions',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer admin-token-1753107854913',
      'x-username': 'admin',
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Response:', response);
        console.log('Subscriptions count:', response.subscriptions ? response.subscriptions.length : 0);
      } catch (error) {
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Request error:', error);
  });
  
  req.end();
}

// Also test with curl-like approach
async function testWithFetch() {
  console.log('\n=== Testing with Fetch ===\n');
  try {
    const response = await fetch('http://localhost:3001/api/admin/subscriptions', {
      headers: {
        'Authorization': 'Bearer admin-token-1753107854913',
        'x-username': 'admin'
      }
    });
    
    console.log('Fetch Status:', response.status);
    const data = await response.json();
    console.log('Fetch Response:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Start server and test
console.log('Starting server test...');
setTimeout(() => {
  testAdminEndpoint();
  setTimeout(() => testWithFetch(), 1000);
}, 2000);
