#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Frontend Registration Tests...\n');

// Start the server
console.log('📡 Starting backend server...');
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

// Wait for server to start
setTimeout(() => {
  console.log('✅ Server started, running tests...\n');
  
  // Run the tests
  const testProcess = spawn('node', ['test-registration-frontend.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  testProcess.on('close', (code) => {
    console.log(`\n🎯 Tests completed with exit code: ${code}`);
    
    // Kill the server
    server.kill('SIGTERM');
    
    process.exit(code);
  });
  
  testProcess.on('error', (error) => {
    console.error('❌ Test execution failed:', error);
    server.kill('SIGTERM');
    process.exit(1);
  });
  
}, 3000); // Wait 3 seconds for server to start

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping tests and server...');
  server.kill('SIGTERM');
  process.exit(0);
});
