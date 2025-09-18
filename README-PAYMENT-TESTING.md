# Payment Gateway Testing Guide

This guide provides comprehensive instructions for testing the payment gateway integration in the Milk Delivery App.

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- MySQL database running
- Server running on port 3001

### Start the Server
```bash
cd backend
npm start
```

### Install Dependencies
```bash
cd backend
npm install axios
```

## 📋 Test Scripts Overview

### 1. Automated Testing (`test-payment-gateway.js`)
Comprehensive automated test suite covering all payment gateway functionality.

```bash
node test-payment-gateway.js
```

### 2. Manual Testing (`test-payment-manual.js`)
Interactive CLI for manual testing with step-by-step guidance.

```bash
node test-payment-manual.js
```

### 3. Complete Test Runner (`run-payment-tests.js`)
Runs all tests and generates detailed reports.

```bash
node run-payment-tests.js
```

## 🧪 Test Categories

### 1. Configuration Tests
- ✅ Razorpay credentials validation
- ✅ Server health check
- ✅ API endpoint accessibility

### 2. Payment Flow Tests
- ✅ Order creation
- ✅ Payment verification
- ✅ Subscription creation
- ✅ Payment status tracking

### 3. User Management Tests
- ✅ User registration
- ✅ User login
- ✅ Subscription management
- ✅ Profile updates

### 4. Admin Tests
- ✅ Admin login
- ✅ Admin dashboard access
- ✅ Subscription management

### 5. Error Handling Tests
- ✅ Invalid payment IDs
- ✅ Amount mismatches
- ✅ Network failures
- ✅ Authentication failures

## 💳 Test Card Details

### Successful Payment
- **Card Number**: 4111 1111 1111 1111
- **Expiry**: 12/25
- **CVV**: 123
- **Name**: Test User

### Failed Payment Scenarios
- **Card Declined**: 4000 0000 0000 0002
- **Insufficient Funds**: 4000 0000 0000 9995
- **Generic Decline**: 4000 0000 0000 9987

## 🔗 Test URLs

### Web Interface Tests
- **Test Payment Page**: http://localhost:3001/public/test-payment.html
- **Subscription Page**: http://localhost:3001/public/subscription.html
- **Payment Debug**: http://localhost:3001/public/payment-debug.html

### API Endpoints
- **Create Order**: POST /api/razorpay/create-order
- **Verify Payment**: POST /api/verify-payment
- **Create Subscription**: POST /api/subscriptions
- **Check Status**: GET /api/subscriptions/check/:username

## 📊 Test Reports

### Generated Files
- `payment-test-report.json` - Detailed JSON report
- `payment-test-report.html` - Visual HTML report

### Report Contents
- Test execution summary
- Pass/fail status for each test
- Error messages and stack traces
- Performance metrics
- Server health status

## 🎯 Step-by-Step Testing

### 1. Basic Configuration Test
```bash
node test-payment-gateway.js
```

### 2. Manual Interactive Testing
```bash
node test-payment-manual.js
```

### 3. Complete Test Suite
```bash
node run-payment-tests.js
```

### 4. Browser Testing
1. Open http://localhost:3001/public/test-payment.html
2. Follow the instructions on the page
3. Use test card details provided
4. Complete the payment flow

## 🔧 Troubleshooting

### Common Issues

#### Server Not Starting
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check MySQL service
sudo systemctl status mysql

# Test database connection
node test-mysql-connection.js
```

#### Payment Gateway Errors
- Verify Razorpay credentials in `razorpay-config.js`
- Check internet connectivity
- Ensure test mode is enabled

#### Test Failures
- Check server logs for detailed error messages
- Verify all dependencies are installed
- Ensure database is properly seeded

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=true node test-payment-gateway.js
```

## 📈 Performance Testing

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery run payment-load-test.yml
```

### Sample Load Test Configuration
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Create Order"
    requests:
      - post:
          url: "/api/razorpay/create-order"
          json:
            amount: 150000
            currency: "INR"
```

## 🔄 Continuous Testing

### GitHub Actions Integration
Create `.github/workflows/payment-tests.yml`:
```yaml
name: Payment Gateway Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: node run-payment-tests.js
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the test reports in `payment-test-report.html`
3. Check server logs for detailed error messages
4. Verify all prerequisites are met

## 📝 Test Checklist

- [ ] Server is running on port 3001
- [ ] Database is connected and seeded
- [ ] Razorpay test credentials are configured
- [ ] All test scripts are executable
- [ ] Test card details are available
- [ ] Browser testing URLs are accessible
- [ ] Reports are generated successfully
- [ ] All tests pass in the test suite

## 🎉 Success Criteria

All tests should pass with:
- ✅ 100% configuration tests
- ✅ 100% payment flow tests
- ✅ 100% user management tests
- ✅ 100% admin tests
- ✅ 100% error handling tests
- ✅ All browser tests working
- ✅ Reports generated without errors
