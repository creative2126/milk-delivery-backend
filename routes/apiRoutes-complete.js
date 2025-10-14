// apiRoutes.js - Milk Delivery App
const express = require('express');
const router = express.Router();
const db = require('../db');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
console.log('==== apiRoutes.js router LOADED ====');

// ================= LOGIN ROUTE WITH DEBUG LOGGING =================
router.post('/login', async (req, res) => {
  try {
    console.log('📥 POST /api/login - Origin:', req.headers.origin);
    console.log('📦 Request body:', JSON.stringify(req.body));
    
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', username);
    console.log('🔑 Password received:', password ? 'YES' : 'NO', 'Length:', password?.length);
    
    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ success: false, error: 'Email/Username and password required' });
    }

    // Query user by email or username
    console.log('🔍 Searching for user:', username);
    const users = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [username, username]);
    
    console.log('📊 Query result:', users ? `Found ${users.length} user(s)` : 'No users found');
    
    if (!users || users.length === 0) {
      console.log('❌ User not found in database');
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];
    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      username: user.username,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });

    // Compare password (hashed)
    console.log('🔐 Comparing passwords...');
    console.log('   - Input password length:', password.length);
    console.log('   - Stored hash length:', user.password?.length);
    
    const match = await bcrypt.compare(password, user.password);
    console.log('✅ Password match result:', match);
    
    if (!match) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '7d' }
    );
    console.log('✅ Token generated successfully');

    console.log('✨ Login successful for:', user.email);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone
      },
      token
    });
  } catch (error) {
    console.error('💥 Login error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ================= HELPER FUNCTIONS =================
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MilkDeliveryApp/1.0 (your-email@example.com)' }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

// ================= PROFILE =================
router.get('/profile', cacheMiddleware.cacheUserData(600), async (req, res) => {
  try {
    const usernameOrEmail = req.query.username;
    if (!usernameOrEmail) return res.status(400).json({ error: 'Username is required' });

    const query = 'SELECT * FROM users WHERE username = ? OR email = ? OR name = ?';
    const userData = await db.query(query, [usernameOrEmail, usernameOrEmail, usernameOrEmail]);
    if (!userData || userData.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userData[0];
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
    if (!street || !city || !state || !zip) return res.status(400).json({ error: 'All address fields are required' });

    const fullAddress = `${street}, ${city}, ${state}, ${zip}`;
    const geo = await geocodeAddress(fullAddress);
    const latitude = geo?.latitude || null;
    const longitude = geo?.longitude || null;

    const updateQuery = `
      UPDATE users
      SET street = ?, city = ?, state = ?, zip = ?, latitude = ?, longitude = ?
      WHERE username = ?
    `;
    const result = await db.query(updateQuery, [street, city, state, zip, latitude, longitude, username]);

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
      SELECT
        subscription_type,
        subscription_duration,
        subscription_created_at as subscription_start_date,
        subscription_end_date,
        subscription_status,
        paused_at,
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
    const subscriptions = await db.query(query, [username]);
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

    const userResult = await db.query('SELECT id, username, subscription_status, subscription_amount FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!userResult || userResult.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userResult[0];

    const summaryQuery = `
      SELECT
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN subscription_status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
        SUM(CASE WHEN subscription_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
        SUM(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE 0 END) as total_active_value,
        AVG(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE NULL END) as avg_subscription_value
      FROM users
      WHERE id = ?
    `;
    const [summary] = await db.query(summaryQuery, [user.id]);

    const renewalsQuery = `
      SELECT
        id,
        subscription_type as product_name,
        subscription_end_date as renewal_date,
        DATEDIFF(subscription_end_date, CURDATE()) as days_until_renewal,
        subscription_amount as renewal_amount
      FROM users
      WHERE id = ? AND subscription_status = 'active' AND subscription_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY subscription_end_date ASC
    `;
    const [upcomingRenewals] = await db.query(renewalsQuery, [user.id]);

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

    const userResult = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (!userResult || userResult.length === 0) return res.status(404).json({ code: 1001, error: 'User account not found' });
    const userId = userResult[0].id;

    const existingSub = await db.query('SELECT id FROM subscriptions WHERE user_id = ? AND subscription_type = ? AND status = ?', [userId, subscription_type, 'active']);
    if (existingSub && existingSub.length > 0) {
      return res.status(400).json({
        code: 1002,
        error: 'Active subscription of this type already exists',
        details: 'You already have an active subscription of this type. You can subscribe again after your current subscription ends.'
      });
    }

    const insertResult = await db.query(
      `INSERT INTO subscriptions
      (user_id, subscription_type, duration, amount, address, building_name, flat_number, payment_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [userId, subscription_type, duration, amount, address, building_name, flat_number, payment_id]
    );

    if (!insertResult || !insertResult.insertId) return res.status(500).json({ code: 1003, error: 'Failed to create subscription' });

    res.json({ id: insertResult.insertId, message: 'Subscription created successfully' });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ code: 1004, error: 'Internal server error' });
  }
});

module.exports = router;
