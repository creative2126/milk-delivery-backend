#!/usr/bin/env node
const RegistrationTester = require('./test-registration-frontend');

async function runTests() {
  console.log('🚀 Starting Frontend Registration Tests...\n');
  
  const tester = new RegistrationTester();
  
  try {
    await tester.init();
    
    console.log('📋 Running all registration tests...\n');
    
    const results = await tester.runAllTests();
    
    console.log('\n=== Test Results Summary ===');
    console.log(`✅ Total Tests: ${Object.keys(results).length}`);
    console.log(`✅ Passed: ${Object.values(results).filter(Boolean).length}`);
    console.log(`❌ Failed: ${Object.values(results).filter(r => !r).length}`);
    
    // Exit with appropriate code
    process.exit(Object.values(results).every(Boolean) ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = runTests;
