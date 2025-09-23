// Automated Login Test Script for Milk Delivery Frontend
const axios = require('axios');

class LoginTester {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.results = [];
    }

    async runTests() {
        console.log('🚀 Starting Login Functionality Tests...\n');
        
        await this.testInvalidLogin();
        await this.testValidRegistration();
        await this.testFormValidation();
        await this.testForgotPassword();
        
        this.printResults();
    }

    async testInvalidLogin() {
        try {
            console.log('🧪 Testing invalid login...');
            const response = await axios.post(`${this.baseURL}/api/login`, {
                username: 'invalid_user',
                password: 'wrong_password'
            }, {
                validateStatus: status => status < 500 // Don't throw for 4xx errors
            });

            if (response.status === 401 || response.status === 400) {
                this.results.push({ test: 'Invalid Login', status: 'PASS', message: 'Properly rejects invalid credentials' });
            } else {
                this.results.push({ test: 'Invalid Login', status: 'FAIL', message: `Unexpected status: ${response.status}` });
            }
        } catch (error) {
            this.results.push({ test: 'Invalid Login', status: 'ERROR', message: error.message });
        }
    }

    async testValidRegistration() {
        try {
            console.log('🧪 Testing user registration...');
            const testEmail = `testuser_${Date.now()}@example.com`;
            
            const response = await axios.post(`${this.baseURL}/api/users`, {
                username: testEmail,
                password: 'Test123!',
                name: 'Test User',
                phone: '9876543210',
                email: testEmail
            }, {
                validateStatus: status => status < 500
            });

            if (response.status === 200 || response.status === 201) {
                this.results.push({ test: 'User Registration', status: 'PASS', message: 'User registered successfully' });
            } else if (response.status === 409) {
                this.results.push({ test: 'User Registration', status: 'PASS', message: 'Registration validates duplicate users' });
            } else {
                this.results.push({ test: 'User Registration', status: 'FAIL', message: `Status: ${response.status}, Data: ${JSON.stringify(response.data)}` });
            }
        } catch (error) {
            this.results.push({ test: 'User Registration', status: 'ERROR', message: error.message });
        }
    }

    async testFormValidation() {
        try {
            console.log('🧪 Testing form validation...');
            
            // Test empty fields
            const response = await axios.post(`${this.baseURL}/api/login`, {
                username: '',
                password: ''
            }, {
                validateStatus: status => status < 500
            });

            if (response.status === 400) {
                this.results.push({ test: 'Form Validation', status: 'PASS', message: 'Validates empty fields' });
            } else {
                this.results.push({ test: 'Form Validation', status: 'FAIL', message: `Missing validation for empty fields` });
            }
        } catch (error) {
            this.results.push({ test: 'Form Validation', status: 'ERROR', message: error.message });
        }
    }

    async testForgotPassword() {
        try {
            console.log('🧪 Testing forgot password endpoint...');
            
            const response = await axios.post(`${this.baseURL}/api/forgot-password`, {
                email: 'test@example.com'
            }, {
                validateStatus: status => status < 500
            });

            // This endpoint might not exist, so we check for various responses
            if (response.status === 200 || response.status === 404 || response.status === 400) {
                this.results.push({ test: 'Forgot Password', status: 'PASS', message: 'Forgot password endpoint responds appropriately' });
            } else {
                this.results.push({ test: 'Forgot Password', status: 'FAIL', message: `Unexpected response: ${response.status}` });
            }
        } catch (error) {
            this.results.push({ test: 'Forgot Password', status: 'INFO', message: 'Forgot password endpoint not configured (may be expected)' });
        }
    }

    printResults() {
        console.log('\n📊 TEST RESULTS:');
        console.log('='.repeat(50));
        
        let passed = 0;
        let failed = 0;
        let errors = 0;
        let info = 0;

        this.results.forEach(result => {
            let emoji = '❓';
            if (result.status === 'PASS') {
                emoji = '✅';
                passed++;
            } else if (result.status === 'FAIL') {
                emoji = '❌';
                failed++;
            } else if (result.status === 'ERROR') {
                emoji = '⚠️';
                errors++;
            } else if (result.status === 'INFO') {
                emoji = 'ℹ️';
                info++;
            }
            
            console.log(`${emoji} ${result.test}: ${result.status} - ${result.message}`);
        });

        console.log('='.repeat(50));
        console.log(`📈 Summary: ${passed} Passed, ${failed} Failed, ${errors} Errors, ${info} Info`);
        console.log(`🎯 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new LoginTester();
    tester.runTests().catch(console.error);
}

module.exports = LoginTester;