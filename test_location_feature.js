// Test script to verify the user location feature with Google Maps link
const fetch = require('node-fetch');

async function testGeocoding() {
    const address = '123 Main St, New York, NY, 10001';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MilkDeliveryApp/1.0 (test@example.com)'
            }
        });
        const data = await response.json();
        console.log('Geocoding test result:', data);
        if (data && data.length > 0) {
            console.log('✅ Geocoding successful:', {
                latitude: data[0].lat,
                longitude: data[0].lon
            });
        } else {
            console.log('❌ No geocoding results found');
        }
    } catch (error) {
        console.error('❌ Geocoding test failed:', error);
    }
}

async function testProfileAPI() {
    try {
        const response = await fetch('http://localhost:3001/api/profile?username=testuser');
        const data = await response.json();
        console.log('Profile API test result:', data);

        if (data.user && data.user.latitude && data.user.longitude) {
            console.log('✅ Profile API returns lat/lng:', {
                latitude: data.user.latitude,
                longitude: data.user.longitude
            });
        } else {
            console.log('ℹ️ Profile API does not have lat/lng (expected for users without location)');
        }
    } catch (error) {
        console.error('❌ Profile API test failed:', error);
    }
}

async function testAddressUpdate() {
    try {
        const response = await fetch('http://localhost:3001/api/users/testuser', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zip: '10001'
            })
        });
        const data = await response.json();
        console.log('Address update test result:', data);

        if (data.success) {
            console.log('✅ Address update successful:', {
                latitude: data.latitude,
                longitude: data.longitude
            });
        } else {
            console.log('❌ Address update failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Address update test failed:', error);
    }
}

// Run tests
async function runTests() {
    console.log('🧪 Testing User Location Feature...\n');

    console.log('1. Testing geocoding functionality:');
    await testGeocoding();

    console.log('\n2. Testing profile API (may fail if server not running):');
    await testProfileAPI();

    console.log('\n3. Testing address update (may fail if server not running):');
    await testAddressUpdate();

    console.log('\n✅ Test script completed. Check results above.');
}

runTests();
