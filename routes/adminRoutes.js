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

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find admin user
    const users = await db.execute(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND role = ?',
      [username, username, 'admin']
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '24h' }
    );

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
    logger.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check admin access
router.get('/check', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    message: 'Admin access verified',
    user: req.user
  });
});

// Get all subscriptions for admin
router.get('/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
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

    const subscriptions = await db.execute(query, params);

    res.json({
      subscriptions: subscriptions,
      total: subscriptions.length
    });
  } catch (error) {
    logger.error('Error fetching admin subscriptions:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get subscription statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM subscriptions');
    const [activeRows] = await db.execute('SELECT COUNT(*) as active FROM subscriptions WHERE status = "active"');
    const [revenueRows] = await db.execute('SELECT SUM(amount) as revenue FROM subscriptions WHERE status = "active"');
    const [todayRows] = await db.execute(`
      SELECT COUNT(*) as today FROM subscriptions
      WHERE DATE(created_at) = CURDATE()
    `);

    // Simplified parsing - db.execute returns array of objects
    const totalSubscriptions = totalRows ? parseInt(totalRows.total) || 0 : 0;
    const activeSubscriptions = activeRows ? parseInt(activeRows.active) || 0 : 0;
    // Handle NULL case for SUM when no active subscriptions
    const totalRevenue = revenueRows && revenueRows.revenue !== null ? parseFloat(revenueRows.revenue) || 0 : 0;
    const todaySubscriptions = todayRows ? parseInt(todayRows.today) || 0 : 0;

    res.json({
      totalSubscriptions: totalSubscriptions,
      activeSubscriptions: activeSubscriptions,
      totalRevenue: totalRevenue,
      todaySubscriptions: todaySubscriptions
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
