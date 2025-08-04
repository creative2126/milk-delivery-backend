#!/usr/bin/env node

/**
 * Test script to verify subscription saving functionality
 * Run with: node test-subscription-fix.js
 */

const mysql = require('mysql2/promise');
const axios = require('axios');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306
};

// Test data
const testSubscription = {
  username: 'test_user',
  subscription_type: '500ml',
  duration: '6days',
  amount: 300,
  address: '123 Test Street, Test City, Test State, 123456',
  building_name: 'Test Building',
  flat_number: 'A-101',
  latitude: 19.0760,
  longitude: 72.8777,
  payment_id: 'test_payment_123456'
};

async function runTests() {
  console.log('🧪 Starting subscription saving tests...\n');

  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Test 1: Check if database schema is updated
    console.log('\n📋 Test 1: Checking database schema...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'subscriptions' AND TABLE_SCHEMA = 'milk_delivery'
    `);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    console.log('Available columns:', columnNames);
    
    if (columnNames.includes('latitude') && columnNames.includes('longitude')) {
      console.log('✅ Schema updated with latitude/longitude columns');
    } else {
      console.log('⚠️  Schema needs updating - run db-update-subscriptions.sql');
    }

    // Test 2: Test user exists
    console.log('\n👤 Test 2: Checking test user...');
    const [users] = await connection.execute(
      'SELECT username FROM users WHERE username = ?',
      [testSubscription.username]
    );
    
    if (users.length === 0) {
      console.log('⚠️  Test user not found, creating...');
      await connection.execute(
        'INSERT INTO users (username, password, name, phone, email) VALUES (?, ?, ?, ?, ?)',
        [testSubscription.username, 'testpass123', 'Test User', '9876543210', 'test@example.com']
      );
      console.log('✅ Test user created');
    } else {
      console.log('✅ Test user exists');
    }

    // Test 3: Test subscription API endpoint
    console.log('\n🔄 Test 3: Testing subscription API...');
    
    try {
      const response = await axios.post('http://localhost:3001/api/subscriptions', testSubscription);
      
      if (response.data.success) {
        console.log('✅ Subscription API working correctly');
        console.log('Subscription ID:', response.data.subscriptionId);
      } else {
        console.log('❌ Subscription API returned error:', response.data);
      }
    } catch (error) {
      console.log('❌ Subscription API error:', error.response?.data || error.message);
    }

    // Test 4: Verify subscription was saved
    console.log('\n🔍 Test 4: Verifying subscription saved...');
    const [subscriptions] = await connection.execute(
      'SELECT * FROM subscriptions WHERE username = ? ORDER BY created_at DESC LIMIT 1',
      [testSubscription.username]
    );
    
    if (subscriptions.length > 0) {
      const saved = subscriptions[0];
      console.log('✅ Subscription saved successfully');
      console.log('Details:', {
        id: saved.id,
        type: saved.subscription_type,
        amount: saved.amount,
        address: saved.address,
        payment_id: saved.payment_id,
        latitude: saved.latitude,
        longitude: saved.longitude
      });
    } else {
      console.log('❌ No subscription found in database');
    }

    // Test 5: Check error logging
    console.log('\n📊 Test 5: Checking error logging...');
    const [errors] = await connection.execute(
      'SELECT * FROM subscription_errors ORDER BY created_at DESC LIMIT 5'
    );
    
    if (errors.length > 0) {
      console.log('📋 Recent errors:', errors.map(e => ({
        username: e.username,
        error: e.error_message,
        time: e.created_at
      })));
    } else {
      console.log('✅ No recent errors logged');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
