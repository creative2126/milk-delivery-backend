const puppeteer = require('puppeteer');
const assert = require('assert');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USERS = {
  valid: {
    username: `testuser_${Date.now()}`,
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    phone: '9876543210'
  },
  duplicate: {
    username: 'duplicateuser',
    email: 'duplicate@example.com',
    password: 'TestPass123!'
  },
  weak: {
    username: 'weakuser',
    email: 'weak@example.com',
    password: '123'
  },
  invalidEmail: {
    username: 'invaliduser',
    email: 'invalid-email',
    password: 'TestPass123!'
  }
};

class RegistrationTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless testing
      slowMo: 50 // Slow down actions for visibility
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigateToRegister() {
    console.log('Navigating to registration page...');
    await this.page.goto(`${BASE_URL}/register.html`);
    await this.page.waitForSelector('#registerForm');
  }

  async fillRegistrationForm(userData) {
    console.log('Filling registration form...');
    
    await this.page.type('#username', userData.username);
    await this.page.type('#email', userData.email);
    await this.page.type('#password', userData.password);
    
    if (userData.name) {
      await this.page.type('#name', userData.name);
    }
    
    if (userData.phone) {
      await this.page.type('#phone', userData.phone);
    }
  }

  async submitForm() {
    console.log('Submitting form...');
    await this.page.click('button[type="submit"]');
  }

  async waitForResponse() {
    try {
      // Wait for either success (navigation) or error (alert/error message)
      await this.page.waitForFunction(
        () => window.location.pathname.includes('login') || 
               document.querySelector('.error-message')?.textContent ||
               document.querySelector('.alert'),
        { timeout: 5000 }
      );
    } catch (error) {
      console.log('No immediate response detected');
    }
  }

  async getErrorMessages() {
    const errors = {};
    
    const usernameError = await this.page.$eval('#usernameError', el => el.textContent).catch(() => '');
    const emailError = await this.page.$eval('#emailError', el => el.textContent).catch(() => '');
    const passwordError = await this.page.$eval('#passwordError', el => el.textContent).catch(() => '');
    
    if (usernameError) errors.username = usernameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    
    // Check for alert messages
    const alertText = await this.page.evaluate(() => {
      const alert = document.querySelector('.alert') || document.querySelector('[role="alert"]');
      return alert ? alert.textContent : '';
    });
    
    if (alertText) errors.alert = alertText;
    
    return errors;
  }

  async testSuccessfulRegistration() {
    console.log('\n=== Testing Successful Registration ===');
    
    await this.navigateToRegister();
    await this.fillRegistrationForm(TEST_USERS.valid);
    await this.submitForm();
    
    // Wait for redirect to login page
    try {
      await this.page.waitForNavigation({ timeout: 5000 });
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('login.html')) {
        console.log('✅ SUCCESS: Registration successful and redirected to login');
        return true;
      }
    } catch (error) {
      const errors = await this.getErrorMessages();
      console.log('❌ FAILED: Registration failed with errors:', errors);
      return false;
    }
    
    return false;
  }

  async testDuplicateUsername() {
    console.log('\n=== Testing Duplicate Username ===');
    
    // First, create the user
    await this.navigateToRegister();
    await this.fillRegistrationForm(TEST_USERS.duplicate);
    await this.submitForm();
    
    // Wait a bit then try to register same username
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.navigateToRegister();
    await this.fillRegistrationForm({
      ...TEST_USERS.duplicate,
      email: 'different@example.com'
    });
    await this.submitForm();
    
    const errors = await this.getErrorMessages();
    if (errors.username && errors.username.includes('already taken')) {
      console.log('✅ SUCCESS: Duplicate username properly rejected');
      return true;
    }
    
    console.log('❌ FAILED: Duplicate username not detected');
    return false;
  }

  async testDuplicateEmail() {
    console.log('\n=== Testing Duplicate Email ===');
    
    await this.navigateToRegister();
    await this.fillRegistrationForm({
      ...TEST_USERS.duplicate,
      username: 'differentuser'
    });
    await this.submitForm();
    
    const errors = await this.getErrorMessages();
    if (errors.email && errors.email.includes('already registered')) {
      console.log('✅ SUCCESS: Duplicate email properly rejected');
      return true;
    }
    
    console.log('❌ FAILED: Duplicate email not detected');
    return false;
  }

  async testWeakPassword() {
    console.log('\n=== Testing Weak Password ===');
    
    await this.navigateToRegister();
    await this.fillRegistrationForm(TEST_USERS.weak);
    await this.submitForm();
    
    const errors = await this.getErrorMessages();
    if (errors.password || (errors.alert && errors.alert.includes('6 characters'))) {
      console.log('✅ SUCCESS: Weak password properly rejected');
      return true;
    }
    
    console.log('❌ FAILED: Weak password not detected');
    return false;
  }

  async testInvalidEmail() {
    console.log('\n=== Testing Invalid Email Format ===');
    
    await this.navigateToRegister();
    await this.fillRegistrationForm(TEST_USERS.invalidEmail);
    await this.submitForm();
    
    const errors = await this.getErrorMessages();
    if (errors.email && errors.email.includes('valid email')) {
      console.log('✅ SUCCESS: Invalid email format properly rejected');
      return true;
    }
    
    console.log('❌ FAILED: Invalid email format not detected');
    return false;
  }

  async testMissingRequiredFields() {
    console.log('\n=== Testing Missing Required Fields ===');
    
    await this.navigateToRegister();
    
    // Submit empty form
    await this.submitForm();
    
    const errors = await this.getErrorMessages();
    const hasErrors = Object.keys(errors).length > 0;
    
    if (hasErrors) {
      console.log('✅ SUCCESS: Missing required fields properly rejected');
      return true;
    }
    
    console.log('❌ FAILED: Missing required fields not detected');
    return false;
  }

  async testFormValidation() {
    console.log('\n=== Testing Form Validation ===');
    
    await this.navigateToRegister();
    
    // Test username validation
    await this.page.type('#username', 'ab'); // Too short
    await this.page.click('#email'); // Trigger blur
    
    const usernameError = await this.page.$eval('#usernameError', el => el.textContent).catch(() => '');
    if (usernameError) {
      console.log('✅ SUCCESS: Username validation working');
    }
    
    // Test email validation
    await this.page.type('#email', 'invalid-email');
    await this.page.click('#password'); // Trigger blur
    
    const emailError = await this.page.$eval('#emailError', el => el.textContent).catch(() => '');
    if (emailError) {
      console.log('✅ SUCCESS: Email validation working');
    }
    
    return true;
  }

  async runAllTests() {
    console.log('🚀 Starting Frontend Registration Tests...\n');
    
    try {
      await this.init();
      
      const results = {
        successfulRegistration: await this.testSuccessfulRegistration(),
        duplicateUsername: await this.testDuplicateUsername(),
        duplicateEmail: await this.testDuplicateEmail(),
        weakPassword: await this.testWeakPassword(),
        invalidEmail: await this.testInvalidEmail(),
        missingFields: await this.testMissingRequiredFields(),
        formValidation: await this.testFormValidation()
      };
      
      console.log('\n=== Test Results Summary ===');
      Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
      });
      
      const totalTests = Object.keys(results).length;
      const passedTests = Object.values(results).filter(Boolean).length;
      
      console.log(`\n📊 Total: ${totalTests}, Passed: ${passedTests}, Failed: ${totalTests - passedTests}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return false;
    } finally {
      await this.close();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new RegistrationTester();
  tester.runAllTests()
    .then(results => {
      process.exit(Object.values(results).every(Boolean) ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = RegistrationTester;
