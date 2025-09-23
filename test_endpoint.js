const http = require('http');

const testEndpoint = (path) => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`\nTesting ${path}:`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response body:', data);
    });
  });

  req.on('error', (err) => {
    console.error(`Error testing ${path}:`, err.message);
  });

  req.end();
};

// Test the problematic endpoint
testEndpoint('/api/subscriptions/remaining/abhi');

// Test a known working endpoint
testEndpoint('/health');
