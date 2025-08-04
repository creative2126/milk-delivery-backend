const http = require('http');

// Test admin login with correct credentials
const testData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('Testing admin login...');
console.log('Credentials:', { username: 'admin', password: 'admin123' });

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('✅ Admin login successful!');
        console.log('Token:', response.token);
        console.log('User:', response.user);
      } else {
        console.log('❌ Login failed:', response.message);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Network error:', error.message);
});

req.write(testData);
req.end();
