const https = require('https');

console.log('🧪 Testing Deployed Backend...');
console.log('📍 Backend URL: https://milk-delivery-backend.onrender.com');

// Test 1: Health endpoint
const testHealth = () => {
    return new Promise((resolve) => {
        const req = https.request('https://milk-delivery-backend.onrender.com/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n1️⃣  Health Check:`);
                console.log(`   Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    console.log('   ✅ Backend is healthy');
                } else {
                    console.log('   ❌ Backend health check failed');
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`   ❌ Error: ${err.message}`);
            resolve();
        });

        req.setTimeout(10000, () => {
            console.log('   ⏰ Request timeout');
            req.destroy();
            resolve();
        });

        req.end();
    });
};

// Test 2: Admin login endpoint
const testAdminLogin = () => {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });

        const options = {
            hostname: 'milk-delivery-backend.onrender.com',
            port: 443,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n2️⃣  Admin Login Test:`);
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Response: ${data.substring(0, 100)}...`);

                if (res.statusCode === 401) {
                    console.log('   ✅ Admin login endpoint exists (401 - Invalid credentials)');
                } else if (res.statusCode === 404) {
                    console.log('   ❌ Admin login endpoint not found');
                } else if (res.statusCode === 200) {
                    console.log('   ✅ Admin login successful!');
                } else {
                    console.log('   ⚠️  Unexpected response');
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`   ❌ Error: ${err.message}`);
            resolve();
        });

        req.setTimeout(10000, () => {
            console.log('   ⏰ Request timeout');
            req.destroy();
            resolve();
        });

        req.write(postData);
        req.end();
    });
};

// Test 3: Check if admin routes are registered
const testAdminRoutes = () => {
    return new Promise((resolve) => {
        const req = https.request('https://milk-delivery-backend.onrender.com/api/admin', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n3️⃣  Admin Routes Check:`);
                console.log(`   Status: ${res.statusCode}`);

                if (res.statusCode === 404) {
                    console.log('   ❌ Admin routes not found');
                } else if (res.statusCode === 403 || res.statusCode === 401) {
                    console.log('   ✅ Admin routes exist (protected endpoint)');
                } else {
                    console.log('   ⚠️  Unexpected response');
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`   ❌ Error: ${err.message}`);
            resolve();
        });

        req.setTimeout(10000, () => {
            console.log('   ⏰ Request timeout');
            req.destroy();
            resolve();
        });

        req.end();
    });
};

// Run all tests
async function runTests() {
    console.log('🚀 Starting tests...\n');

    await testHealth();
    await testAdminLogin();
    await testAdminRoutes();

    console.log('\n🎯 Test completed!');
    console.log('\n📋 Summary:');
    console.log('   - If admin login returns 401: ✅ Backend is working correctly');
    console.log('   - If admin login returns 404: ❌ Admin routes not deployed');
    console.log('   - If admin login returns 200: ✅ Login successful with test credentials');
}

runTests().catch(console.error);
