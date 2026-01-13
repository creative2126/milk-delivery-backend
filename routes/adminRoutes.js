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

    res.json({ token, username: admin.username });
  } catch (err) {
    console.error('Admin login error:', err);
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
      `SELECT COUNT(*) today FROM users 
       WHERE DATE(subscription_created_at)=CURDATE()
       AND subscription_type IS NOT NULL`
    );

    res.json({
      totalSubscriptions: total.total || 0,
      activeSubscriptions: active.active || 0,
      totalRevenue: parseFloat(revenue.revenue) || 0,
      todaySubscriptions: today.today || 0
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({
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

    let query = `
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
        subscription_end_date AS end_date
      FROM users
      WHERE subscription_type IS NOT NULL
    `;

    const params = [];
    if (status && status !== 'all') {
      query += ` AND subscription_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY subscription_created_at DESC`;

    const [rows] = await db.query(query, params);
    res.json({ subscriptions: rows || [] });
  } catch (e) {
    console.error('Subscriptions list error:', e);
    res.status(500).json({ subscriptions: [] });
  }
});

/* ================= SINGLE ORDER STATS ================= */
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [[total]] = await db.query(
      `SELECT COUNT(*) total FROM orders`
    );
    const [[pending]] = await db.query(
      `SELECT COUNT(*) pending FROM orders WHERE order_status='paid'`
    );
    const [[completed]] = await db.query(
      `SELECT COUNT(*) completed FROM orders WHERE order_status='delivered'`
    );
    const [[revenue]] = await db.query(
      `SELECT IFNULL(SUM(total_amount),0) revenue FROM orders`
    );

    res.json({
      totalOrders: total.total || 0,
      pendingOrders: pending.pending || 0,
      completedOrders: completed.completed || 0,
      totalRevenue: parseFloat(revenue.revenue) || 0
    });
  } catch (e) {
    console.error('Order stats error:', e);
    res.status(500).json({
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0
    });
  }
});

/* ================= SINGLE ORDERS LIST ================= */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        o.id,
        o.user_id,
        o.user_email,
        o.order_type,
        o.total_amount,
        o.order_status,
        o.delivery_date,
        o.delivery_slot,
        o.address,
        o.latitude,
        o.longitude,
        o.payment_id,
        o.created_at,
        u.username,
        u.phone,
        u.subscription_flat_number AS flat_number,
        u.subscription_building_name AS building_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;

    if (status && status !== 'all') {
      if (status === 'pending') query += ` AND o.order_status='paid'`;
      else if (status === 'completed') query += ` AND o.order_status='delivered'`;
      else if (status === 'cancelled') query += ` AND o.order_status='cancelled'`;
    }

    query += ` ORDER BY o.created_at DESC`;

    const [rows] = await db.query(query);

    const orders = (rows || []).map(o => ({
      id: o.id,
      user_id: o.user_id,
      username: o.username || 'N/A',
      email: o.user_email,
      phone: o.phone || 'N/A',
      flat_number: o.flat_number || 'N/A',
      building_name: o.building_name || 'N/A',
      product_name: 'Fresh Milk',
      product_type: 'single',
      quantity: 1,
      amount: o.total_amount,
      total_amount: o.total_amount,
      status: o.order_status === 'paid' ? 'pending'
            : o.order_status === 'delivered' ? 'completed'
            : o.order_status,
      order_date: o.created_at,
      delivery_date: o.delivery_date,
      delivery_slot: o.delivery_slot,
      address: o.latitude && o.longitude
        ? `${o.address}, Lat: ${o.latitude}, Lng: ${o.longitude}`
        : o.address,
      payment_id: o.payment_id,
      created_at: o.created_at
    }));

    res.json({ orders });
  } catch (e) {
    console.error('Orders list error:', e);
    res.status(500).json({ orders: [] });
  }
});

/* ================= UPDATE ORDER STATUS ================= */
router.patch('/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let dbStatus = status;
    if (status === 'pending') dbStatus = 'paid';
    if (status === 'completed') dbStatus = 'delivered';

    await db.query(
      `UPDATE orders SET order_status=? WHERE id=?`,
      [dbStatus, id]
    );

    res.json({ message: 'Order status updated' });
  } catch (e) {
    console.error('Update order error:', e);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
