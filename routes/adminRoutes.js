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
      `SELECT IFNULL(SUM(subscription_amount),0) revenue FROM users WHERE subscription_amount IS NOT NULL`
    );
    const [[today]] = await db.query(
      `SELECT COUNT(*) today FROM users WHERE DATE(subscription_created_at)=CURDATE() AND subscription_type IS NOT NULL`
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
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query += ` AND subscription_status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY subscription_created_at DESC`;

    const [rows] = await db.query(query, params);

    res.json({ subscriptions: rows });
  } catch (e) {
    console.error('Subscriptions list error:', e);
    res.status(500).json({ subscriptions: [] });
  }
});

/* ================= ORDER STATS (SINGLE ORDERS) ================= */
router.get('/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total orders
    const [[total]] = await db.query(`SELECT COUNT(*) total FROM orders`);
    
    // Pending orders (paid or pending status)
    const [[pending]] = await db.query(
      `SELECT COUNT(*) pending FROM orders WHERE order_status IN ('paid', 'pending')`
    );
    
    // Completed/Delivered orders
    const [[completed]] = await db.query(
      `SELECT COUNT(*) completed FROM orders WHERE order_status = 'delivered'`
    );
    
    // Total revenue
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

/* ================= ORDER LIST ================= */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Query orders with user information
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
        u.flat_number,
        u.building_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add status filter if provided
    if (status && status !== 'all') {
      // Map frontend status to database status
      if (status === 'pending') {
        query += ` AND o.order_status IN ('paid', 'pending')`;
      } else if (status === 'completed') {
        query += ` AND o.order_status = 'delivered'`;
      } else if (status === 'cancelled') {
        query += ` AND o.order_status = 'cancelled'`;
      } else {
        query += ` AND o.order_status = ?`;
        params.push(status);
      }
    }
    
    query += ` ORDER BY o.created_at DESC`;

    const [rows] = await db.query(query, params);
    
    // Transform data to match frontend expectations
    const transformedOrders = rows.map(order => {
      // Map database status to frontend status
      let frontendStatus = order.order_status;
      if (order.order_status === 'paid') {
        frontendStatus = 'pending';
      } else if (order.order_status === 'delivered') {
        frontendStatus = 'completed';
      }
      
      // Format address with lat/lng if available
      let formattedAddress = order.address || '';
      if (order.latitude && order.longitude) {
        formattedAddress += `, Lat: ${order.latitude}, Lng: ${order.longitude}`;
      }
      
      // Determine product name based on order type or use a default
      let productName = 'Fresh Milk';
      if (order.order_type === 'single') {
        productName = 'Single Order - Fresh Milk';
      }
      
      return {
        id: order.id,
        user_id: order.user_id,
        username: order.username || 'N/A',
        email: order.user_email || 'N/A',
        phone: order.phone || 'N/A',
        flat_number: order.flat_number || 'N/A',
        building_name: order.building_name || 'N/A',
        product_name: productName,
        product_type: order.order_type || 'single',
        quantity: 1, // Single orders are typically 1 unit
        amount: order.total_amount || 0,
        total_amount: order.total_amount || 0,
        status: frontendStatus,
        order_date: order.created_at,
        delivery_date: order.delivery_date,
        delivery_slot: order.delivery_slot,
        address: formattedAddress,
        payment_id: order.payment_id,
        created_at: order.created_at
      };
    });

    res.json({ orders: transformedOrders });
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
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Map frontend status to database status
    let dbStatus = status;
    if (status === 'pending') {
      dbStatus = 'paid'; // or 'pending' based on your preference
    } else if (status === 'completed') {
      dbStatus = 'delivered';
    }
    
    const [result] = await db.query(
      'UPDATE orders SET order_status = ? WHERE id = ?',
      [dbStatus, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ 
      message: 'Order status updated successfully',
      status: status
    });
  } catch (e) {
    console.error('Update order status error:', e);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/* ================= GET SINGLE ORDER ================= */
router.get('/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.query(
      `SELECT
        o.*,
        u.username,
        u.phone,
        u.flat_number,
        u.building_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?`,
      [id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = rows[0];
    
    // Map status for frontend
    if (order.order_status === 'paid') {
      order.order_status = 'pending';
    } else if (order.order_status === 'delivered') {
      order.order_status = 'completed';
    }
    
    res.json({ order: order });
  } catch (e) {
    console.error('Get order error:', e);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/* ================= DELETE ORDER (USE WITH CAUTION) ================= */
router.delete('/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query(
      'DELETE FROM orders WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ 
      message: 'Order deleted successfully'
    });
  } catch (e) {
    console.error('Delete order error:', e);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
