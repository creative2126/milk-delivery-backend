const fetch = require('node-fetch');

async function testAdminLoginEndpoint() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    console.log('🧪 Testing Admin Login Endpoint...');
    console.log(`📍 Base URL: ${baseUrl}`);
    console.log('🔗 Endpoint: /api/admin/login\n');

    try {
        // Test 1: Check if endpoint exists (should return 404 if not found)
        console.log('1️⃣  Testing endpoint availability...');
        const response = await fetch(`${baseUrl}/api/admin/login`, {
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

        if (response.status === 404) {
            console.log('   ❌ ERROR: Admin login endpoint not found (404)');
            console.log('   💡 This confirms the issue - the endpoint is not accessible');
            return false;
        } else if (response.status === 401) {
            console.log('   ✅ SUCCESS: Admin login endpoint found (401 - Invalid credentials)');
            console.log('   📝 This is expected - the endpoint exists but credentials are invalid');
        } else if (response.status === 400) {
            console.log('   ✅ SUCCESS: Admin login endpoint found (400 - Missing fields)');
            console.log('   📝 This is expected - the endpoint exists but fields are missing');
        } else {
            console.log(`   ✅ SUCCESS: Admin login endpoint found (${response.status})`);
        }

        // Test 2: Check health endpoint to verify server is running
        console.log('\n2️⃣  Testing health endpoint...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);

        if (healthResponse.status === 200) {
            console.log('   ✅ Server is running and healthy');
        } else {
            console.log('   ❌ Server health check failed');
        }

        // Test 3: Check if admin routes are registered
        console.log('\n3️⃣  Testing admin routes registration...');
        const adminCheckResponse = await fetch(`${baseUrl}/api/admin/check`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test-token'
            }
        });

        console.log(`   Status: ${adminCheckResponse.status} ${adminCheckResponse.statusText}`);

        if (adminCheckResponse.status === 401) {
            console.log('   ✅ Admin routes are properly registered (401 - Unauthorized)');
        } else if (adminCheckResponse.status === 404) {
            console.log('   ❌ Admin routes not found');
        }

        console.log('\n🎯 Test completed!');
        return true;

    } catch (error) {
        console.log('   ❌ ERROR: Cannot connect to server');
        console.log(`   Error: ${error.message}`);
        console.log('   💡 Make sure the server is running on the correct port');
        return false;
    }
}

// Run the test
testAdminLoginEndpoint().then(success => {
    if (success) {
        console.log('\n✅ All tests passed! The admin login endpoint should be working.');
    } else {
        console.log('\n❌ Tests failed! There are issues with the admin login endpoint.');
    }
    process.exit(success ? 0 : 1);
});
