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

    const [rows] = await db.query(
      `SELECT * FROM users WHERE (email=? OR username=?) AND role='admin' LIMIT 1`,
      [username, username]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ================= SUBSCRIPTION STATS ================= */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [[total]] = await db.query(
      `SELECT COUNT(*) total FROM users WHERE subscription_type IS NOT NULL`
    );
    const [[active]] = await db.query(
      `SELECT COUNT(*) active FROM users WHERE subscription_status='active'`
    );
    const [[revenue]] = await db.query(
      `SELECT IFNULL(SUM(subscription_amount),0) revenue FROM users`
    );
    const [[today]] = await db.query(
      `SELECT COUNT(*) today FROM users WHERE DATE(subscription_created_at)=CURDATE()`
    );

    res.json({
      totalSubscriptions: total.total,
      activeSubscriptions: active.active,
      totalRevenue: revenue.revenue,
      todaySubscriptions: today.today
    });
  } catch (e) {
    res.status(500).json({ error: 'Stats failed' });
  }
});

/* ================= SUBSCRIPTIONS LIST ================= */
router.get('/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
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
      ORDER BY subscription_created_at DESC`
    );

    res.json({ subscriptions: rows });
  } catch (e) {
    res.status(500).json({ subscriptions: [] });
  }
});

/* ================= ORDER STATS (SINGLE ORDERS) ================= */
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [[total]] = await db.query(`SELECT COUNT(*) total FROM orders`);
    const [[pending]] = await db.query(
      `SELECT COUNT(*) pending FROM orders WHERE order_status='paid'`
    );
    const [[delivered]] = await db.query(
      `SELECT COUNT(*) delivered FROM orders WHERE order_status='delivered'`
    );
    const [[revenue]] = await db.query(
      `SELECT IFNULL(SUM(total_amount),0) revenue FROM orders`
    );

    res.json({
      totalOrders: total.total,
      pendingOrders: pending.pending,
      completedOrders: delivered.delivered,
      totalRevenue: revenue.revenue
    });
  } catch (e) {
    res.status(500).json({
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0
    });
  }
});

/* ================= ORDER LIST ================= */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        user_email AS email,
        total_amount,
        order_status AS status,
        address,
        latitude,
        longitude,
        delivery_date,
        created_at
      FROM orders
      ORDER BY created_at DESC`
    );

    res.json({ orders: rows });
  } catch (e) {
    res.status(500).json({ orders: [] });
  }
});

module.exports = router;
