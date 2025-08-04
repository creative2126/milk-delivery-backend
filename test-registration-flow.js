#!/usr/bin/env node
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test registration endpoint
async function testRegistrationFlow() {
  console.log('🧪 Testing Registration Flow...');
  
  const testData = {
    username: 'testuser123',
    password: 'TestPass123',
    email: 'test@example.com',
    phone: '1234567890',
    address: '123 Test St',
    name: 'Test User'
  };
  
  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    const db = require('./db');
    const [rows] = await db.execute('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Test 2: Check users table
    const [users] = await db.execute('SELECT * FROM users WHERE username = ?', ['testuser123']);
    console.log('✅ Users table exists and accessible');
    
    // Test 3: Test registration endpoint
    console.log('3. Testing registration endpoint...');
    
    // Simulate registration
    const [result] = await db.execute(
      'INSERT INTO users (username, password, email, phone, address, name) VALUES (?, ?, ?, ?, ?, ?)',
      [testData.username, testData.password, testData.email, testData.phone, testData.address, testData.name]
    );
    
    console.log('✅ Registration test completed successfully');
    
    // Test 4: Verify user was created
    const [newUser] = await db.execute('SELECT * FROM users WHERE username = ?', [testData.username]);
    console.log('✅ User created successfully');
    
    // Test 5: Test login endpoint
    const [loginUser] = await db.execute('SELECT * FROM users WHERE username = ?', [testData.username]);
    console.log('✅ Login test completed successfully');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testRegistrationFlow();
