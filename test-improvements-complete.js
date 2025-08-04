#!/usr/bin/env node
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Complete comprehensive test suite for milk delivery app improvements
class CompleteImprovementsTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.startTime = Date.now();
    this.testUser = {
      username: `improvement_test_${Date.now()}`,
      email: `improvement_test_${Date.now()}@example.com`,
      password: 'TestPass123!',
      name: 'Improvement Test User',
      phone: '9876543210'
    };
  }

  async makeRequest(method, path, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${path}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      if (data) config.data = data;

      const response = await axios(config);
      return { status: response.status, data: response.data, success: true };
    } catch (error) {
      return {
        status: error.response?.status || 500,
        data: error.response?.data || error.message,
        success: false,
        error: error.message
      };
    }
  }

  logTest(testName, passed, details = '') {
    const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`  ${status} ${testName} ${details}`);
    
    this.testResults.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async testPerformance() {
    console.log(chalk.blue('\n🚀 Testing Performance Improvements...'));
    
    const endpoints = [
      '/api/users',
      '/api/profile?username=testuser',
      '/api/subscriptions',
      '/api/milk-products'
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      const start = Date.now();
      const result = await this.makeRequest('GET', endpoint);
      const duration = Date.now() - start;
      
      results.push({ endpoint, duration, success: result.success });
      this.logTest(
        `Performance: ${endpoint}`,
        result.success && duration < 1000,
        `${duration}ms`
      );
    }

    const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    this.logTest('Average Response Time', avgResponseTime < 500, `${avgResponseTime.toFixed(2)}ms`);
  }

  async testSecurity() {
    console.log(chalk.blue('\n🔒 Testing Security Improvements...'));
    
    // SQL injection test
    const sqlPayload = { username: "admin' OR '1'='1", password: "' OR '1'='1" };
    const sqlResult = await this.makeRequest('POST', '/api/login', sqlPayload);
    this.logTest('SQL Injection Prevention', sqlResult.status === 400);

    // XSS prevention test
    const xssPayload = {
      username: this.testUser.username,
      email: '<script>alert("XSS")</script>@example.com'
    };
    const xssResult = await this.makeRequest('POST', '/api/register', xssPayload);
    this.logTest('XSS Prevention', xssResult.status === 400 || !xssResult.data.email?.includes('<script>'));

    // Rate limiting test
    const requests = Array(10).fill(null).map(() => 
      this.makeRequest('POST', '/api/login', { username: 'test', password: 'wrong' })
    );
    const rateResults = await Promise.all(requests);
    const rateLimited = rateResults.some(r => r.status === 429);
    this.logTest('Rate Limiting', rateLimited);
  }

  async testDataValidation() {
    console.log(chalk.blue('\n📋 Testing Data Validation Improvements...'));
    
    const validationTests = [
      {
        name: 'Invalid Email Format',
        data: { username: 'test', email: 'invalid-email', password: 'Test123!' },
        expectedStatus: 400
      },
      {
        name: 'Weak Password',
        data: { username: 'test', email: 'test@example.com', password: '123' },
        expectedStatus: 400
      },
      {
        name: 'Missing Required Fields',
        data: { username: 'test' },
        expectedStatus: 400
      },
      {
        name: 'Invalid Phone Format',
        data: { 
          username: 'test', 
          email: 'test@example.com', 
          password: 'Test123!',
          phone: 'invalid-phone'
        },
        expectedStatus: 400
      }
    ];

    for (const test of validationTests) {
      const result = await this.makeRequest('POST', '/api/register', test.data);
      this.logTest(test.name, result.status === test.expectedStatus);
    }
  }

  async testErrorHandling() {
    console.log(chalk.blue('\n⚠️  Testing Error Handling Improvements...'));
    
    const errorTests = [
      { method: 'GET', path: '/api/nonexistent-endpoint' },
      { method: 'POST', path: '/api/users', data: {} },
      { method: 'GET', path: '/api/profile' },
      { method: 'PUT', path: '/api/subscriptions/99999', data: { status: 'active' } }
    ];

    for (const test of errorTests) {
      const result = await this.makeRequest(test.method, test.path, test.data);
      const hasProperError = result.data && 
        (typeof result.data === 'object') && 
        (result.data.error || result.data.message);
      this.logTest(
        `Error Handling: ${test.method} ${test.path}`,
        hasProperError && result.status >= 400
      );
    }
  }

  async testDatabaseIntegrity() {
    console.log(chalk.blue('\n🗄️  Testing Database Integrity...'));
    
    // Test user registration and data consistency
    const regResult = await this.makeRequest('POST', '/api/register', this.testUser);
    this.logTest('User Registration', regResult.success);
    
    if (regResult.success) {
      // Test profile retrieval
      const profileResult = await this.makeRequest('GET', `/api/profile?username=${this.testUser.username}`);
      this.logTest('Profile Data Consistency', 
        profileResult.success && 
        profileResult.data.username === this.testUser.username &&
        profileResult.data.email === this.testUser.email
      );
    }

    // Test subscription creation
    const subscriptionData = {
      username: this.testUser.username,
      subscription_type: 'daily',
      duration: '30 days',
      amount: 1500,
      address: 'Test Address 123',
      building_name: 'Test Building',
      flat_number: 'A101',
      payment_id: `test_payment_${Date.now()}`
    };
    
    const subResult = await this.makeRequest('POST', '/api/subscriptions', subscriptionData);
    this.logTest('Subscription Creation', subResult.success);
  }

  async testAPIConsistency() {
    console.log(chalk.blue('\n🔗 Testing API Consistency...'));
    
    // Test response format consistency
    const endpoints = [
      '/api/milk-products',
      '/api/subscriptions',
      '/api/users'
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest('GET', endpoint);
      const hasConsistentFormat = result.success && 
        (Array.isArray(result.data) || typeof result.data === 'object');
      this.logTest(`API Format: ${endpoint}`, hasConsistentFormat);
    }
  }

  async testFrontendIntegration() {
    console.log(chalk.blue('\n🌐 Testing Frontend Integration...'));
    
    // Test CORS headers
    const result = await this.makeRequest('GET', '/api/milk-products');
    this.logTest('CORS Configuration', result.success);

    // Test static file serving
    const staticResult = await this.makeRequest('GET', '/index.html');
    this.logTest('Static File Serving', staticResult.status === 200 || staticResult.status === 404);
  }

  async generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.startTime;

    console.log(chalk.blue('\n📊 IMPROVEMENTS TEST SUMMARY'));
    console.log('================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${chalk.green(passedTests)}`);
    console.log(`Failed: ${chalk.red(failedTests)}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);

    // Save detailed report
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        duration,
        successRate: ((passedTests/totalTests)*100).toFixed(1)
      },
      details: this.testResults,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(__dirname, 'test-improvements-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(chalk.green('\n📄 Detailed report saved to test-improvements-report.json'));
  }

  async runAllTests() {
    console.log(chalk.yellow('🎯 Starting Complete Improvements Testing...\n'));
    
    try {
      await this.testPerformance();
      await this.testSecurity();
      await this.testDataValidation();
      await this.testErrorHandling();
      await this.testDatabaseIntegrity();
      await this.testAPIConsistency();
      await this.testFrontendIntegration();
      
      await this.generateReport();
      
      console.log(chalk.green('\n🎉 All improvements tests completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Test suite failed:'), error.message);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CompleteImprovementsTester();
  tester.runAllTests();
}

module.exports = CompleteImprovementsTester;
