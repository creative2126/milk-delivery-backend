#!/usr/bin/env node

// Payment Gateway Test Runner
// This script runs all payment gateway tests and generates a comprehensive report

const fs = require('fs');
const path = require('path');
const PaymentGatewayTester = require('./test-payment-gateway');
const ManualPaymentTester = require('./test-payment-manual');

class PaymentTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.testResults.push(logEntry);
    
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    const color = colors[type] || colors.info;
    console.log(`${color}[${type.toUpperCase()}] ${timestamp}: ${message}${colors.reset}`);
  }

  async checkServerHealth() {
    this.log('Checking server health...');
    
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/api/subscriptions/check/testuser', {
        timeout: 5000
      });
      
      this.log('✅ Server is running and responsive');
      return true;
    } catch (error) {
      this.log('❌ Server is not running or not responding', 'error');
      this.log('Please start the server with: npm start', 'warning');
      return false;
    }
  }

  async runAutomatedTests() {
    this.log('Starting automated payment gateway tests...');
    
    const tester = new PaymentGatewayTester();
    const results = await tester.runAllTests();
    
    return results;
  }

  async runManualTests() {
    this.log('Starting manual payment tests...');
    
    // Create a simple test for manual verification
    const manualTests = [
      {
        name: 'Test Payment Page Access',
        test: async () => {
          const axios = require('axios');
          const response = await axios.get('http://localhost:3001/public/test-payment.html');
          return response.status === 200;
        }
      },
      {
        name: 'Test Subscription Page Access',
        test: async () => {
          const axios = require('axios');
          const response = await axios.get('http://localhost:3001/public/subscription.html');
          return response.status === 200;
        }
      },
      {
        name: 'Test Razorpay Configuration Endpoint',
        test: async () => {
          const axios = require('axios');
          const response = await axios.get('http://localhost:3001/api/razorpay/config');
          return response.status === 200 && response.data.key_id;
        }
      }
    ];

    const results = [];
    
    for (const test of manualTests) {
      try {
        const success = await test.test();
        results.push({
          name: test.name,
          success,
          message: success ? 'Test passed' : 'Test failed'
        });
        
        if (success) {
          this.log(`✅ ${test.name}`);
        } else {
          this.log(`❌ ${test.name}`, 'error');
        }
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          message: error.message
        });
        this.log(`❌ ${test.name}: ${error.message}`, 'error');
      }
    }
    
    return results;
  }

  async generateTestReport(automatedResults, manualResults) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      serverHealth: await this.checkServerHealth(),
      automatedTests: {
        total: automatedResults.totalTests,
        passed: automatedResults.passedTests,
        failed: automatedResults.failedTests,
        results: automatedResults.results
      },
      manualTests: {
        total: manualResults.length,
        passed: manualResults.filter(r => r.success).length,
        failed: manualResults.filter(r => !r.success).length,
        results: manualResults
      },
      summary: {
        totalTests: automatedResults.totalTests + manualResults.length,
        totalPassed: automatedResults.passedTests + manualResults.filter(r => r.success).length,
        totalFailed: automatedResults.failedTests + manualResults.filter(r => !r.success).length,
        successRate: ((automatedResults.passedTests + manualResults.filter(r => r.success).length) / 
                      (automatedResults.totalTests + manualResults.length) * 100).toFixed(2) + '%'
      }
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, 'payment-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(__dirname, 'payment-test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Gateway Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .test-section {
            margin-bottom: 30px;
        }
        .test-section h2 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 5px;
        }
        .test-result {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            background: #f8f9fa;
        }
        .test-result.success {
            border-left: 4px solid #28a745;
        }
        .test-result.failed {
            border-left: 4px solid #dc3545;
        }
        .status-icon {
            font-size: 1.2em;
        }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .server-status {
            text-align: center;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .server-status.online {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .server-status.offline {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥛 Milk Delivery Payment Gateway Test Report</h1>
        
        <div class="server-status ${report.serverHealth ? 'online' : 'offline'}">
            <strong>Server Status:</strong> ${report.serverHealth ? 'Online' : 'Offline'}
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value success">${report.summary.totalPassed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value failed">${report.summary.totalFailed}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value">${report.summary.successRate}</div>
            </div>
        </div>
        
        <div class="test-section">
            <h2>Automated Tests</h2>
            ${report.automatedTests.results.map(result => `
                <div class="test-result ${result.success ? 'success' : 'failed'}">
                    <span>${result.test}</span>
                    <span class="status-icon ${result.success ? 'success' : 'failed'}">
                        ${result.success ? '✅' : '❌'}
                    </span>
                </div>
            `).join('')}
        </div>
        
        <div class="test-section">
            <h2>Manual Tests</h2>
            ${report.manualTests.results.map(result => `
                <div class="test-result ${result.success ? 'success' : 'failed'}">
                    <span>${result.name}</span>
                    <span class="status-icon ${result.success ? 'success' : 'failed'}">
                        ${result.success ? '✅' : '❌'}
                    </span>
                </div>
            `).join('')}
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>Report generated on ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Test duration: ${report.duration}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async run() {
    console.log('🥛 Milk Delivery Payment Gateway Test Runner');
    console.log('==========================================\n');
    
    // Check if server is running
    const serverHealth = await this.checkServerHealth();
    
    if (!serverHealth) {
      console.log('\n⚠️  Server is not running. Please start it with:');
      console.log('   cd backend && npm start');
      console.log('\nThen run this script again.');
      return;
    }
    
    // Run automated tests
    console.log('🚀 Running automated tests...');
    const automatedTester = new PaymentGatewayTester();
    const automatedResults = await automatedTester.runAllTests();
    
    // Run manual tests
    console.log('\n🔍 Running manual tests...');
    const manualResults = await this.runManualTests();
    
    // Generate report
    console.log('\n📊 Generating test report...');
    const report = await this.generateTestReport(automatedResults, manualResults);
    
    // Display summary
    console.log('\n📋 Test Summary:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.totalPassed}`);
    console.log(`Failed: ${report.summary.totalFailed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    
    console.log('\n📁 Reports generated:');
    console.log(`- JSON Report: payment-test-report.json`);
    console.log(`- HTML Report: payment-test-report.html`);
    
    if (report.summary.totalFailed > 0) {
      console.log('\n❌ Failed tests detected. Check the reports for details.');
    } else {
      console.log('\n✅ All tests passed! Payment gateway is working correctly.');
    }
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new PaymentTestRunner();
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = PaymentTestRunner;
