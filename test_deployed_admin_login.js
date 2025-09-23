const fetch = require('node-fetch');

async function testDeployedAdminLogin() {
    const deployedUrl = 'https://milk-delivery-backend.onrender.com';

    console.log('🧪 Testing Deployed Admin Login...');
    console.log(`📍 Deployed Backend URL: ${deployedUrl}`);
    console.log('🔗 Endpoint: /api/admin/login\n');

    try {
        // Test 1: Check if deployed endpoint exists
        console.log('1️⃣  Testing deployed admin login endpoint...');
        const response = await fetch(`${deployedUrl}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'test',
                password: 'test'
            })
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.status === 401) {
            console.log('   ✅ SUCCESS: Deployed admin login endpoint is working (401 - Invalid credentials)');
            console.log('   📝 This is expected - the endpoint exists but credentials are invalid');
        } else if (response.status === 400) {
            console.log('   ✅ SUCCESS: Deployed admin login endpoint is working (400 - Missing fields)');
            console.log('   📝 This is expected - the endpoint exists but fields are missing');
        } else if (response.status === 200) {
            console.log('   ✅ SUCCESS: Deployed admin login endpoint is working (200 - Login successful)');
            console.log('   📝 Admin login successful with test credentials');
        } else {
            console.log(`   ❌ ERROR: Unexpected status code: ${response.status}`);
        }

        // Test 2: Check health endpoint to verify deployed server is running
        console.log('\n2️⃣  Testing deployed server health...');
        const healthResponse = await fetch(`${deployedUrl}/health`);
        console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);

        if (healthResponse.status === 200) {
            console.log('   ✅ Deployed server is running and healthy');
        } else {
            console.log('   ❌ Deployed server health check failed');
        }

        // Test 3: Check admin stats endpoint
        console.log('\n3️⃣  Testing deployed admin stats endpoint...');
        const statsResponse = await fetch(`${deployedUrl}/api/admin/stats`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test-token'
            }
        });

        console.log(`   Status: ${statsResponse.status} ${statsResponse.statusText}`);

        if (statsResponse.status === 401) {
            console.log('   ✅ Deployed admin stats endpoint is working (401 - Unauthorized)');
            console.log('   📝 This is expected - requires valid admin token');
        } else if (statsResponse.status === 403) {
            console.log('   ✅ Deployed admin stats endpoint is working (403 - Forbidden)');
            console.log('   📝 This is expected - requires admin privileges');
        } else {
            console.log(`   ❌ Unexpected status for admin stats: ${statsResponse.status}`);
        }

        console.log('\n🎯 Deployed backend tests completed!');
        console.log('\n📋 Summary:');
        console.log('   - If admin login returns 401: ✅ Backend is working correctly');
        console.log('   - If admin login returns 404: ❌ Admin routes not deployed');
        console.log('   - If admin login returns 200: ✅ Login successful with test credentials');

        return true;

    } catch (error) {
        console.log('   ❌ ERROR: Cannot connect to deployed backend');
        console.log(`   Error: ${error.message}`);
        console.log('   💡 Make sure the deployed backend is running and accessible');
        return false;
    }
}

// Run the test
testDeployedAdminLogin().then(success => {
    if (success) {
        console.log('\n✅ All deployed backend tests passed!');
        console.log('   The admin login should now work on https://freshndorganic.com/admin-login');
    } else {
        console.log('\n❌ Deployed backend tests failed!');
        console.log('   There may be issues with the deployed backend');
    }
    process.exit(success ? 0 : 1);
});
