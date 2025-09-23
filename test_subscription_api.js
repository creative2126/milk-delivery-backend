const API_BASE_URL = 'https://milk-delivery-backend.onrender.com/api';

async function testSubscriptionAPI() {
    console.log('Testing subscription API endpoints...');

    // Test data
    const testData = {
        username: 'testuser',
        subscription_type: 'milk',
        duration: 'monthly',
        amount: '500.00',
        address: '123 Test Street',
        building_name: 'Test Building',
        flat_number: '101',
        payment_id: 'test_payment_123'
    };

    // Test 1: POST to /api/subscriptions (without trailing slash)
    console.log('\n1. Testing POST /api/subscriptions (without trailing slash)');
    try {
        const response1 = await fetch(`${API_BASE_URL}/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log('Status:', response1.status);
        console.log('Response:', await response1.text());
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 2: POST to /api/subscriptions/ (with trailing slash)
    console.log('\n2. Testing POST /api/subscriptions/ (with trailing slash)');
    try {
        const response2 = await fetch(`${API_BASE_URL}/subscriptions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        console.log('Status:', response2.status);
        console.log('Response:', await response2.text());
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 3: GET all subscriptions
    console.log('\n3. Testing GET /api/subscriptions');
    try {
        const response3 = await fetch(`${API_BASE_URL}/subscriptions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Status:', response3.status);
        if (response3.ok) {
            console.log('Response:', await response3.text());
        } else {
            console.log('Error response:', await response3.text());
        }
    } catch (error) {
        console.log('Error:', error.message);
    }
}

// Run the test
testSubscriptionAPI();
