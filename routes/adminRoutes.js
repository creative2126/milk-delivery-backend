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

    const result = await db.query(
      `SELECT * FROM users WHERE (email=? OR username=?) AND role='admin' LIMIT 1`,
      [username, username]
    );

    // Handle different result formats
    const rows = Array.isArray(result) && Array.isArray(result[0]) 
      ? result[0] 
      : result;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id || admin.ID, role: 'admin' },
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '24h' }
    );

    res.json({ token, username: admin.username || admin.USERNAME });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* ================= SUBSCRIPTION STATS ================= */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total subscriptions
    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE subscription_type IS NOT NULL`
    );
    const totalRows = Array.isArray(totalResult) && Array.isArray(totalResult[0]) 
      ? totalResult[0] 
      : totalResult;
    const total = totalRows[0]?.total || totalRows[0]?.TOTAL || 0;

    // Active subscriptions
    const activeResult = await db.query(
      `SELECT COUNT(*) as active FROM users WHERE subscription_status='active'`
    );
    const activeRows = Array.isArray(activeResult) && Array.isArray(activeResult[0])
      ? activeResult[0]
      : activeResult;
    const active = activeRows[0]?.active || activeRows[0]?.ACTIVE || 0;

    // Revenue
    const revenueResult = await db.query(
      `SELECT IFNULL(SUM(subscription_amount),0) as revenue FROM users`
    );
    const revenueRows = Array.isArray(revenueResult) && Array.isArray(revenueResult[0])
      ? revenueResult[0]
      : revenueResult;
    const revenue = revenueRows[0]?.revenue || revenueRows[0]?.REVENUE || 0;

    // Today's subscriptions
    const todayResult = await db.query(
      `SELECT COUNT(*) as today FROM users 
       WHERE DATE(subscription_created_at)=CURDATE()
       AND subscription_type IS NOT NULL`
    );
    const todayRows = Array.isArray(todayResult) && Array.isArray(todayResult[0])
      ? todayResult[0]
      : todayResult;
    const today = todayRows[0]?.today || todayRows[0]?.TODAY || 0;

    res.json({
      totalSubscriptions: Number(total) || 0,
      activeSubscriptions: Number(active) || 0,
      totalRevenue: parseFloat(revenue) || 0,
      todaySubscriptions: Number(today) || 0
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

    const result = await db.query(query, params);
    const rows = Array.isArray(result) && Array.isArray(result[0])
      ? result[0]
      : result;

    res.json({ subscriptions: rows || [] });
  } catch (e) {
    console.error('Subscriptions list error:', e);
    res.status(500).json({ subscriptions: [] });
  }
});

/* ================= SINGLE ORDER STATS ================= */
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching order stats...');

    // Total orders
    const totalResult = await db.query(`SELECT COUNT(*) as total FROM orders`);
    const totalRows = Array.isArray(totalResult) && Array.isArray(totalResult[0])
      ? totalResult[0]
      : totalResult;
    const total = totalRows[0]?.total || totalRows[0]?.TOTAL || 0;
    console.log('Total orders:', total);

    // Pending orders
    const pendingResult = await db.query(
      `SELECT COUNT(*) as pending FROM orders WHERE order_status='paid'`
    );
    const pendingRows = Array.isArray(pendingResult) && Array.isArray(pendingResult[0])
      ? pendingResult[0]
      : pendingResult;
    const pending = pendingRows[0]?.pending || pendingRows[0]?.PENDING || 0;
    console.log('Pending orders:', pending);

    // Completed orders
    const completedResult = await db.query(
      `SELECT COUNT(*) as completed FROM orders WHERE order_status='delivered'`
    );
    const completedRows = Array.isArray(completedResult) && Array.isArray(completedResult[0])
      ? completedResult[0]
      : completedResult;
    const completed = completedRows[0]?.completed || completedRows[0]?.COMPLETED || 0;
    console.log('Completed orders:', completed);

    // Revenue
    const revenueResult = await db.query(
      `SELECT IFNULL(SUM(total_amount),0) as revenue FROM orders`
    );
    const revenueRows = Array.isArray(revenueResult) && Array.isArray(revenueResult[0])
      ? revenueResult[0]
      : revenueResult;
    const revenue = revenueRows[0]?.revenue || revenueRows[0]?.REVENUE || 0;
    console.log('Revenue:', revenue);

    const stats = {
      totalOrders: Number(total) || 0,
      pendingOrders: Number(pending) || 0,
      completedOrders: Number(completed) || 0,
      totalRevenue: parseFloat(revenue) || 0
    };

    console.log('✅ Order stats:', stats);
    res.json(stats);
  } catch (e) {
    console.error('❌ Order stats error:', e);
    console.error('Error details:', e.message);
    console.error('Error stack:', e.stack);
    res.status(500).json({
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      error: e.message
    });
  }
});

/* ================= SINGLE ORDERS LIST ================= */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching orders list...');
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

    console.log('Query:', query);

    const result = await db.query(query);
    const rows = Array.isArray(result) && Array.isArray(result[0])
      ? result[0]
      : result;

    console.log('Query returned', rows?.length || 0, 'rows');

    const orders = (rows || []).map(o => ({
      id: o.id || o.ID,
      user_id: o.user_id || o.USER_ID,
      username: o.username || o.USERNAME || 'N/A',
      email: o.user_email || o.USER_EMAIL,
      phone: o.phone || o.PHONE || 'N/A',
      flat_number: o.flat_number || o.FLAT_NUMBER || 'N/A',
      building_name: o.building_name || o.BUILDING_NAME || 'N/A',
      product_name: 'Fresh Milk',
      product_type: 'single',
      quantity: 1,
      amount: o.total_amount || o.TOTAL_AMOUNT,
      total_amount: o.total_amount || o.TOTAL_AMOUNT,
      status: o.order_status === 'paid' ? 'pending'
            : o.order_status === 'delivered' ? 'completed'
            : o.order_status,
      order_date: o.created_at || o.CREATED_AT,
      delivery_date: o.delivery_date || o.DELIVERY_DATE,
      delivery_slot: o.delivery_slot || o.DELIVERY_SLOT,
      address: (o.latitude || o.LATITUDE) && (o.longitude || o.LONGITUDE)
        ? `${o.address || o.ADDRESS || ''}, Lat: ${o.latitude || o.LATITUDE}, Lng: ${o.longitude || o.LONGITUDE}`
        : o.address || o.ADDRESS || 'N/A',
      payment_id: o.payment_id || o.PAYMENT_ID,
      created_at: o.created_at || o.CREATED_AT
    }));

    console.log('✅ Returning', orders.length, 'formatted orders');
    res.json({ orders });
  } catch (e) {
    console.error('❌ Orders list error:', e);
    console.error('Error details:', e.message);
    console.error('Error stack:', e.stack);
    res.status(500).json({ 
      orders: [],
      error: e.message
    });
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
