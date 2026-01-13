const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* ================= ADMIN GUARD ================= */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/* ================= ADMIN LOGIN ================= */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE (username=? OR email=?) AND role="admin" LIMIT 1',
      [username, username]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('ADMIN LOGIN ERROR:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ================= SUBSCRIPTION STATS ================= */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS totalSubscriptions,
        SUM(subscription_status='active') AS activeSubscriptions,
        IFNULL(SUM(subscription_amount),0) AS totalRevenue,
        SUM(DATE(subscription_created_at)=CURDATE()) AS todaySubscriptions
      FROM users
      WHERE subscription_type IS NOT NULL
    `);

    res.json(rows[0] || {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      todaySubscriptions: 0
    });
  } catch (err) {
    console.error('SUBSCRIPTION STATS ERROR:', err);
    res.json({
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      todaySubscriptions: 0
    });
  }
});

/* ================= SUBSCRIPTIONS LIST ================= */
router.get('/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT
        id,
        username,
        email,
        phone,
        subscription_type,
        subscription_duration AS duration,
        subscription_amount AS amount,
        subscription_status AS status,
        subscription_address AS address,
        subscription_building_name AS building_name,
        subscription_flat_number AS flat_number,
        subscription_created_at AS created_at,
        subscription_end_date
      FROM users
      WHERE subscription_type IS NOT NULL
    `;

    const params = [];
    if (status && status !== 'all') {
      sql += ' AND subscription_status=?';
      params.push(status);
    }

    sql += ' ORDER BY subscription_created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json({ subscriptions: rows || [] });
  } catch (err) {
    console.error('SUBSCRIPTIONS ERROR:', err);
    res.json({ subscriptions: [] });
  }
});

/* ================= ORDER STATS ================= */
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS totalOrders,
        SUM(order_status='pending') AS pendingOrders,
        SUM(order_status='delivered') AS completedOrders,
        IFNULL(SUM(total_amount),0) AS totalRevenue
      FROM orders
    `);

    res.json(rows[0] || {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0
    });
  } catch (err) {
    console.error('ORDER STATS ERROR:', err);
    res.json({
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0
    });
  }
});

/* ================= ORDERS LIST ================= */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT
        o.id,
        o.user_email AS email,
        o.total_amount,
        o.order_status AS status,
        o.delivery_date,
        o.address,
        o.created_at,
        u.username,
        u.phone,
        u.subscription_flat_number AS flat_number,
        u.subscription_building_name AS building_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
    `;

    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE o.order_status=?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json({ orders: rows || [] });
  } catch (err) {
    console.error('ORDERS ERROR:', err);
    res.json({ orders: [] });
  }
});

module.exports = router;
