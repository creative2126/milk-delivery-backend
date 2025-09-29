const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Admin login - FIXED to use db.query() like server-complete.js
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Admin login attempt received');
    console.log('Request body:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find admin user - FIXED: Using db.query() to match server pattern
    console.log('🔍 Looking up admin user:', username);
    const result = await db.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND role = ? LIMIT 1',
      [username, username, 'admin']
    );

    console.log('Query result type:', Array.isArray(result) ? 'Array' : typeof result);
    console.log('Query result:', result);

    // Handle different db.query response formats
    let user;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      // Format: [[rows], [fields]]
      user = result[0][0];
    } else if (Array.isArray(result)) {
      // Format: [rows]
      user = result[0];
    }

    console.log('Parsed user:', user);

    if (!user) {
      console.log('❌ Admin user not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    console.log('🔒 Verifying password...');
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('❌ Invalid password for admin:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Password verified, generating token...');

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '24h' }
    );

    console.log('✅ Admin login successful:', username);

    res.json({
      message: 'Admin login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    logger.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Check admin access
router.get('/check', authenticateToken, requireAdmin, (req, res) => {
  console.log('✅ Admin access check passed');
  res.json({
    message: 'Admin access verified',
    user: req.user
  });
});

// Get all subscriptions for admin
router.get('/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching admin subscriptions');
    const { status } = req.query;

    let query = `
      SELECT
        s.id,
        s.username,
        u.phone,
        u.email,
        s.subscription_type,
        s.duration,
        s.amount,
        s.address,
        s.building_name,
        s.flat_number,
        s.status,
        s.payment_id,
        s.created_at
      FROM subscriptions s
      LEFT JOIN users u ON s.username = u.username
    `;

    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await db.query(query, params);
    
    // Handle different response formats
    let subscriptions;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      subscriptions = result[0];
    } else if (Array.isArray(result)) {
      subscriptions = result;
    } else {
      subscriptions = [];
    }

    console.log('✅ Found subscriptions:', subscriptions.length);

    res.json({
      subscriptions: subscriptions,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('❌ Error fetching admin subscriptions:', error);
    logger.error('Error fetching admin subscriptions:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get subscription statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📈 Fetching admin statistics');
    
    const totalResult = await db.query('SELECT COUNT(*) as total FROM subscriptions');
    const activeResult = await db.query('SELECT COUNT(*) as active FROM subscriptions WHERE status = "active"');
    const revenueResult = await db.query('SELECT SUM(amount) as revenue FROM subscriptions WHERE status = "active"');
    const todayResult = await db.query(`
      SELECT COUNT(*) as today FROM subscriptions
      WHERE DATE(created_at) = CURDATE()
    `);

    // Parse results handling different formats
    const parseResult = (result, field) => {
      let row;
      if (Array.isArray(result) && Array.isArray(result[0])) {
        row = result[0][0];
      } else if (Array.isArray(result)) {
        row = result[0];
      }
      return row ? (row[field] || 0) : 0;
    };

    const totalSubscriptions = parseInt(parseResult(totalResult, 'total')) || 0;
    const activeSubscriptions = parseInt(parseResult(activeResult, 'active')) || 0;
    const totalRevenue = parseFloat(parseResult(revenueResult, 'revenue')) || 0;
    const todaySubscriptions = parseInt(parseResult(todayResult, 'today')) || 0;

    console.log('✅ Statistics:', { totalSubscriptions, activeSubscriptions, totalRevenue, todaySubscriptions });

    res.json({
      totalSubscriptions: totalSubscriptions,
      activeSubscriptions: activeSubscriptions,
      totalRevenue: totalRevenue,
      todaySubscriptions: todaySubscriptions
    });
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;