const fetch = require('node-fetch');

async function testAdminStats() {
  try {
    // First login as admin
    const loginResponse = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Now get stats
    const statsResponse = await fetch('http://localhost:3000/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('Stats:', stats);
    } else {
      console.error('Stats fetch failed:', statsResponse.status);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAdminStats();
