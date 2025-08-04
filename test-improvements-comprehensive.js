#!/usr/bin/env node
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Enhanced comprehensive test suite for milk delivery app improvements
class ImprovementsTester {
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

  // Enhanced HTTP client with better error handling
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

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        status: response.status,
        data: response.data,
        success: true
      };
    } catch (error) {
      return {
        status: error.response?.status || 500,
        data: error.response?.data || error.message,
        success: false,
        error: error.message
      };
    }
  }

  // Test logging utility
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

  // Test 1: Performance improvements
  async testPerformanceImprovements() {
    console.log(chalk.blue('\n🚀 Testing Performance Improvements...'));
    
    const endpoints = [
      '/api/users',
      '/api/login',
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

    // Calculate average response time
    const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    this.logTest(
      'Average Response Time',
      avgResponseTime < 500,
      `${avgResponseTime.toFixed(2)}ms`
    );
  }

  // Test 2: Security improvements
  async testSecurityImprovements() {
    console.log(chalk.blue('\n🔒 Testing Security Improvements...'));
    
    // Test SQL injection prevention
    const sqlInjectionPayload = {
      username: "admin' OR '1'='1",
      password: "' OR '1'='1"
    };
    const sqlResult = await this.makeRequest('POST', '/api/login', sqlInjectionPayload);
