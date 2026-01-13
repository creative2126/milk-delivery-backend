const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'mysecretkey';

/* ================= ADMIN AUTH MIDDLEWARE ================= */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/* =========================================================
   📊 SUBSCRIPTION STATS
========================================================= */
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) AS totalSubscriptions,
        SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) AS activeSubscriptions,
        SUM(subscription_total_amount) AS totalRevenue,
        SUM(CASE WHEN DATE(subscription_created_at) = CURDATE() THEN 1 ELSE 0 END) AS todaySubscriptions
      FROM users
      WHERE subscription_status IS NOT NULL
    `);

    res.json({
      totalSubscriptions: stats.totalSubscriptions || 0,
      activeSubscriptions: stats.activeSubscriptions || 0,
      totalRevenue: stats.totalRevenue || 0,
      todaySubscriptions: stats.todaySubscriptions || 0
    });
  } catch (err) {
    console.error('SUBSCRIPTION STATS ERROR:', err);
    res.status(500).json({ error: 'Failed to load subscription stats' });
  }
});

/* =========================================================
   📦 ALL SUBSCRIPTIONS LIST
========================================================= */
router.get('/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const status = req.query.status;

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
        subscription_start_date AS created_at,
        subscription_end_date,
        subscription_address AS address,
        subscription_building_name AS building_name,
        subscription_flat_number AS flat_number
      FROM users
      WHERE subscription_status IS NOT NULL
    `;

    const params = [];

    if (status && status !== 'all') {
      sql += ' AND subscription_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY subscription_created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json({ subscriptions: rows });
  } catch (err) {
    console.error('SUBSCRIPTIONS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/* =========================================================
   🛒 SINGLE ORDERS STATS (FIXES 404)
========================================================= */
router.get('/orders/stats', authenticateAdmin, async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) AS completedOrders,
        SUM(total_amount) AS totalRevenue
      FROM orders
    `);

    res.json({
      totalOrders: stats.totalOrders || 0,
      pendingOrders: stats.pendingOrders || 0,
      completedOrders: stats.completedOrders || 0,
      totalRevenue: stats.totalRevenue || 0
    });
  } catch (err) {
    console.error('ORDER STATS ERROR:', err);
    res.status(500).json({ error: 'Failed to load order stats' });
  }
});

/* =========================================================
   🛒 ALL SINGLE ORDERS LIST (FIXES 404)
========================================================= */
router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const status = req.query.status;

    let sql = `
      SELECT
        o.id,
        o.user_id,
        o.user_email AS email,
        o.total_amount,
        o.order_status AS status,
        o.delivery_date,
        o.delivery_slot,
        o.address,
        o.latitude,
        o.longitude,
        o.payment_id,
        o.created_at,
        u.name AS username,
        u.phone,
        u.subscription_flat_number AS flat_number,
        u.subscription_building_name AS building_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
    `;

    const params = [];

    if (status && status !== 'all') {
      sql += ' WHERE o.order_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json({ orders: rows });
  } catch (err) {
    console.error('ORDERS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/* =========================================================
   ✅ MARK ORDER AS DELIVERED
========================================================= */
router.put('/orders/:id/delivered', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      `UPDATE orders SET order_status = 'delivered' WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Order marked as delivered' });
  } catch (err) {
    console.error('DELIVER ORDER ERROR:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
