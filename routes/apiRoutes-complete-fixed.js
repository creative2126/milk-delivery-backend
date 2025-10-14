// apiRoutes-complete-fixed.js - Milk Delivery App (COMPLETE FIXED VERSION)
const express = require('express');
const router = express.Router();
const db = require('../db');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('==== apiRoutes.js router LOADED ====');

const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey";

// ================= REGISTRATION ROUTE =================
router.post('/users', async (req, res) => {
  try {
    console.log('📥 POST /api/users (REGISTRATION)');
    console.log('📦 Request body:', req.body);

    const { username, password, name, phone, email, street, city, state, zip } = req.body;

    // Validation
    if (!username || !password || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, password, and email are required' 
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', 
      [email, username]
    );

    if (existingUsers && existingUsers.length > 0) {
      console.log('❌ User already exists');
      return res.status(409).json({ 
        success: false, 
        error: 'User with this email or username already exists' 
      });
    }

    // Hash password with 10 salt rounds
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed:', hashedPassword.substring(0, 29) + '...');

    // Geocode address if provided
    let latitude = null;
    let longitude = null;
    if (street && city && state && zip) {
      const fullAddress = `${street}, ${city}, ${state}, ${zip}`;
      const geo = await geocodeAddress(fullAddress);
      latitude = geo?.latitude || null;
      longitude = geo?.longitude || null;
    }

    // Insert user into database
    await db.query(`
      INSERT INTO users 
      (username, password, name, phone, email, street, city, state, zip, latitude, longitude, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [username, hashedPassword, name || null, phone || null, email, street || null, city || null, state || null, zip || null, latitude, longitude]);

    console.log('✅ User registered successfully:', username);

    res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('💥 Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// ================= LOGIN ROUTE (FIXED) =================
router.post('/login', async (req, res) => {
  try {
    console.log('📥 POST /api/login');
    console.log('📦 Request body:', req.body);
    console.log('📍 Origin:', req.headers.origin);

    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Email/Username and password required' 
      });
    }

    // Query database
    console.log('🔍 Searching for user:', username);
    const [result] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?', 
      [username, username]
    );

    if (!result || result.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const user = result[0];
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email
    });

    // Debug password info
    console.log('🔍 Password hash from DB:', user.password.substring(0, 29) + '...');
    console.log('🔍 Hash format check:', {
      starts_with_2a: user.password.startsWith('$2a$'),
      starts_with_2b: user.password.startsWith('$2b$'),
      length: user.password.length
    });
    console.log('🔍 Input password length:', password.length);

    // Compare passwords
    console.log('🔐 Comparing passwords...');
    const match = await bcrypt.compare(password, user.password);
    console.log('🔍 Password match result:', match);

    if (!match) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    console.log('✅ Password matched successfully');

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role || 'user' 
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for user:', user.username);

    res.json({
      success: true,
      token,
      userName: user.name || user.username,
      userEmail: user.email,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// ================= PROFILE ROUTE =================
router.get('/profile', cacheMiddleware.cacheUserData(600), async (req, res) => {
  try {
    const usernameOrEmail = req.query.username;
    if (!usernameOrEmail) return res.status(400).json({ error: 'Username is required' });

    const [rows] = await db.query('SELECT * FROM users WHERE username = ? OR email = ? OR name = ?', 
      [usernameOrEmail, usernameOrEmail, usernameOrEmail]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    const safeUser = {
      name: user.name || 'NA',
      username: user.username || 'NA',
      email: user.email || 'NA',
      phone: user.phone || 'NA',
      street: user.street || 'NA',
      city: user.city || 'NA',
      state: user.state || 'NA',
      zip: user.zip || 'NA',
      latitude: user.latitude || null,
      longitude: user.longitude || null,
      created_at: user.created_at || 'NA',
      updated_at: user.updated_at || 'NA'
    };

    const userWithSubscription = {
      ...safeUser,
      subscription_type: user.subscription_type || null,
      subscription_duration: user.subscription_duration || null,
      subscription_status: user.subscription_status || null,
      subscription_start_date: user.subscription_start_date || null,
      subscription_end_date: user.subscription_end_date || null,
      subscription_address: user.subscription_address || null,
      subscription_building_name: user.subscription_building_name || null,
      subscription_flat_number: user.subscription_flat_number || null,
      subscription_amount: user.subscription_amount || null,
      subscription_payment_id: user.subscription_payment_id || null,
      subscription_created_at: user.subscription_created_at || null,
      subscription_updated_at: user.subscription_updated_at || null,
      remaining_days: user.subscription_end_date
        ? Math.ceil((new Date(user.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null
    };

    res.json({
      user: userWithSubscription,
      subscription: userWithSubscription,
      cache: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Profile fetch error:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ================= UPDATE USER ADDRESS =================
router.put('/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const { street, city, state, zip } = req.body;
    if (!street || !city || !state || !zip) 
      return res.status(400).json({ error: 'All address fields are required' });

    const fullAddress = `${street}, ${city}, ${state}, ${zip}`;
    const geo = await geocodeAddress(fullAddress);
    const latitude = geo?.latitude || null;
    const longitude = geo?.longitude || null;

    const [result] = await db.query(`
      UPDATE users
      SET street = ?, city = ?, state = ?, zip = ?, latitude = ?, longitude = ?
      WHERE username = ?
    `, [street, city, state, zip, latitude, longitude, username]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, message: 'Address updated successfully', latitude, longitude });
  } catch (error) {
    console.error('Error updating user address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// ================= SUBSCRIPTIONS REMAINING =================
router.get('/subscriptions/remaining/:username', cacheMiddleware.cacheUserData(300), async (req, res) => {
  try {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const query = `
      SELECT subscription_type, subscription_duration, subscription_created_at as subscription_start_date,
             subscription_end_date, subscription_status, paused_at,
             CASE
               WHEN subscription_status = 'active' AND subscription_end_date IS NOT NULL THEN GREATEST(DATEDIFF(subscription_end_date, CURDATE()), 0)
               WHEN subscription_status = 'paused' AND subscription_end_date IS NOT NULL AND paused_at IS NOT NULL THEN GREATEST(DATEDIFF(subscription_end_date, paused_at), 0)
               WHEN subscription_status = 'expired' OR subscription_end_date < CURDATE() THEN 0
               ELSE NULL
             END as remaining_days
      FROM users
      WHERE username = ? AND subscription_status IN ('active', 'paused', 'expired')
      LIMIT 1
    `;
    const [subscriptions] = await db.query(query, [username]);
    const sub = subscriptions.length > 0 ? subscriptions[0] : null;

    res.json({
      hasActiveSubscription: sub ? ['active','paused','expired'].includes(sub.subscription_status) : false,
      subscription: sub,
      cache: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Subscriptions remaining error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// ================= SUBSCRIPTIONS SUMMARY =================
router.get('/subscriptions/summary/:username', cacheMiddleware.cacheUserData(300), async (req, res) => {
  try {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const [userResult] = await db.query('SELECT id, username, subscription_status, subscription_amount FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!userResult || userResult.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userResult[0];

    const [summary] = await db.query(`
      SELECT COUNT(*) as total_subscriptions,
             SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
             SUM(CASE WHEN subscription_status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
             SUM(CASE WHEN subscription_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
             SUM(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE 0 END) as total_active_value,
             AVG(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE NULL END) as avg_subscription_value
      FROM users
      WHERE id = ?
    `, [user.id]);

    const [upcomingRenewals] = await db.query(`
      SELECT id, subscription_type as product_name,
             subscription_end_date as renewal_date,
             DATEDIFF(subscription_end_date, CURDATE()) as days_until_renewal,
             subscription_amount as renewal_amount
      FROM users
      WHERE id = ? AND subscription_status = 'active' AND subscription_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY subscription_end_date ASC
    `, [user.id]);

    res.json({
      username,
      summary: summary[0],
      upcomingRenewals: upcomingRenewals.map(r => ({
        subscriptionId: r.id,
        productName: r.product_name,
        renewalDate: r.renewal_date,
        daysUntilRenewal: r.days_until_renewal,
        renewalAmount: r.renewal_amount
      })),
      cache: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Subscriptions summary error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription summary' });
  }
});

// ================= CREATE SUBSCRIPTION =================
router.post('/subscriptions', async (req, res) => {
  try {
    const { username, subscription_type, duration, amount, address, building_name, flat_number, payment_id } = req.body;
    if (!username || !subscription_type || !duration || !amount || !payment_id) {
      return res.status(400).json({ code: 1000, error: 'Missing required subscription fields' });
    }

    const [userResult] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (!userResult || userResult.length === 0) return res.status(404).json({ code: 1001, error: 'User account not found' });
    const userId = userResult[0].id;

    const [existingSub] = await db.query('SELECT id FROM subscriptions WHERE user_id = ? AND subscription_type = ? AND status = ?', [userId, subscription_type, 'active']);
    if (existingSub && existingSub.length > 0) {
      return res.status(400).json({ code: 1002, error: 'Active subscription of this type already exists' });
    }

    const [insertResult] = await db.query(`
      INSERT INTO subscriptions
      (user_id, subscription_type, duration, amount, address, building_name, flat_number, payment_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `, [userId, subscription_type, duration, amount, address, building_name, flat_number, payment_id]);

    if (!insertResult || !insertResult.insertId) return res.status(500).json({ code: 1003, error: 'Failed to create subscription' });

    res.json({ id: insertResult.insertId, message: 'Subscription created successfully' });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ code: 1004, error: 'Internal server error' });
  }
});

// ================= HELPER FUNCTION =================
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'MilkDeliveryApp/1.0' } });
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return null;
}

module.exports = router;
