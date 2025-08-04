#!/usr/bin/env node
const http = require('http');
const fs = require('fs');

// Comprehensive test suite for registration and related endpoints
class ComprehensiveTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async testRegistrationEndpoint() {
    console.log('🧪 Testing Registration Endpoint...');
    
    const testCases = [
      {
        name: 'Valid registration',
        data: {
          username: 'testuser' + Date.now(),
          email: 'test' + Date.now() + '@example.com',
          password: 'TestPass123',
          name: 'Test User',
          phone: '1234567890'
        },
        expectedStatus: 200
      },
      {
        name: 'Missing username',
        data: {
          email: 'test@example.com',
          password: 'TestPass123'
        },
        expectedStatus: 400
      },
      {
        name: 'Invalid email format',
        data: {
          username: 'testuser' + Date.now(),
          email: 'invalid-email',
          password: 'TestPass123'
        },
        expectedStatus: 400
      },
      {
        name: 'Weak password',
        data: {
          username: 'testuser' + Date.now(),
          email: 'test@example.com',
          password: '123'
        },
        expectedStatus: 400
      },
      {
        name: 'Duplicate username',
        data: {
          username: 'testuser123',
          email: 'duplicate@example.com',
          password: 'TestPass123'
        },
        expectedStatus: 409
      },
      {
        name: 'Duplicate email',
        data: {
          username: 'uniqueuser' + Date.now(),
          email: 'test@example.com',
          password: 'TestPass123'
        },
        expectedStatus: 409
      }
    ];

    for (const testCase of testCases) {
      try {
        const result = await this.makeRequest('POST', '/api/register', testCase.data);
        const passed = result.status === testCase.expectedStatus;
        
        console.log(`  ${passed ? '✅' : '❌'} ${testCase.name}: ${result.status}`);
        if (!passed) {
          console.log(`    Expected: ${testCase.expectedStatus}, Got: ${result.status}`);
          console.log(`    Response: ${JSON.stringify(result.data)}`);
        }
        
        this.testResults.push({
          endpoint: 'POST /api/register',
          test: testCase.name,
          passed,
          status: result.status,
          response: result.data
        });
      } catch (error) {
        console.log(`  ❌ ${testCase.name}: Error - ${error.message}`);
        this.testResults.push({
          endpoint: 'POST /api/register',
          test: testCase.name,
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testLoginEndpoint() {
    console.log('🧪 Testing Login Endpoint...');
    
    const testCases = [
      {
        name: 'Valid login',
        data: {
