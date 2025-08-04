const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { verifyPayment } = require('./razorpay-utils');
const {
  validateAddress,
  sanitizeAddress,
  validateBuildingName,
  sanitizeBuildingName,
  validateFlatNumber,
  sanitizeFlatNumber
} = require('./address-utils');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== SUBSCRIPTION MANAGEMENT ENDPOINTS =====

// Get all user subscriptions
app.get('/api/subscriptions/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const [subscriptions] = await db.execute(
      'SELECT id, username, subscription_type, duration, amount, address, building_name, flat_number, status, paused_at, resumed_at, total_paused_days, created_at, updated_at FROM subscriptions WHERE username = ? ORDER BY created_at DESC',
      [username]
    );

    // Check and update expired subscriptions
    const now = new Date();
    for (const sub of subscriptions) {
      const createdAt = new Date(sub.created_at);
      const durationMatch = sub.duration.match(/(\d+)\s*days?/i);
      const totalDays = durationMatch ? parseInt(durationMatch[1]) : 0;
      const endDate = new Date(createdAt);
      endDate.setDate(createdAt.getDate() + totalDays);

      const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      const isExpired = remainingDays === 0;

      if (isExpired && sub.status === 'active') {
        // Update status to expired in DB
        await db.execute(
          'UPDATE subscriptions SET status = "expired", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [sub.id]
        );
        sub.status = 'expired';
      }
    }

    // Re-fetch updated subscriptions after status update
    const [updatedSubscriptions] = await db.execute(
      'SELECT id, username, subscription_type, duration, amount, address, building_name, flat_number, status, paused_at, resumed_at, total_paused_days, created_at, updated_at FROM subscriptions WHERE username = ? ORDER BY created_at DESC',
      [username]
    );

    // Calculate remaining days for each subscription
    const subscriptionsWithDetails = updatedSubscriptions.map(sub => {
      const createdAt = new Date(sub.created_at);
      const durationMatch = sub.duration.match(/(\d+)\s*days?/i);
      const totalDays = durationMatch ? parseInt(durationMatch[1]) : 0;
      const endDate = new Date(createdAt);
      endDate.setDate(createdAt.getDate() + totalDays);
      const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      const isExpired = remainingDays === 0;

      return {
        ...sub,
        end_date: endDate.toISOString().split('T')[0],
        remaining_days: remainingDays,
        is_expired: isExpired
      };
    });

    res.json({ subscriptions: subscriptionsWithDetails });

  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// ===== EXISTING ENDPOINTS =====

// Get subscription remaining days
app.get('/api/subscriptions/remaining/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Include both active and inactive subscriptions for pause/resume functionality
    const [subscriptions] = await db.execute(
      'SELECT id, subscription_type, duration, amount, status, created_at FROM subscriptions WHERE username = ? AND status IN ("active", "inactive") ORDER BY created_at DESC',
      [username]
    );

    if (subscriptions.length === 0) {
      return res.json({ 
        hasActiveSubscription: false,
        remainingDays: 0,
        message: 'No active subscription found'
      });
    }

    const subscription = subscriptions[0];
    
    // Calculate remaining days
    const createdAt = new Date(subscription.created_at);
    const now = new Date();
    
    // Parse duration (e.g., "6 days", "15 days")
    const durationMatch = subscription.duration.match(/(\d+)\s*days?/i);
    if (!durationMatch) {
      return res.status(400).json({ error: 'Invalid duration format' });
    }
    
    const totalDays = parseInt(durationMatch[1]);
    const endDate = new Date(createdAt);
    endDate.setDate(createdAt.getDate() + totalDays);
    
    const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    const isExpired = remainingDays === 0;

    res.json({
      hasActiveSubscription: true,
      subscription: {
        id: subscription.id,
        subscription_type: subscription.subscription_type,
        duration: subscription.duration,
        amount: subscription.amount,
        created_at: subscription.created_at,
        end_date: endDate.toISOString().split('T')[0],
        remaining_days: remainingDays,
        is_expired: isExpired,
        status: isExpired ? 'expired' : subscription.status
      }
    });

  } catch (error) {
    console.error('Error calculating remaining days:', error);
    res.status(500).json({ error: 'Failed to calculate remaining days' });
  }
});

// Check subscription status
app.get('/api/subscriptions/check/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const [activeSubscriptions] = await db.execute(
      'SELECT id, subscription_type, duration, amount, status, created_at FROM subscriptions WHERE username = ? AND status = "active"',
      [username]
    );

    if (activeSubscriptions.length === 0) {
      return res.json({ 
        hasActiveSubscription: false,
        activeSubscriptions: []
      });
    }

    // Calculate remaining days for each subscription
    const subscriptionsWithRemaining = activeSubscriptions.map(sub => {
      const createdAt = new Date(sub.created_at);
      const now = new Date();
      
      const durationMatch = sub.duration.match(/(\d+)\s*days?/i);
      const totalDays = durationMatch ? parseInt(durationMatch[1]) : 0;
      
      const endDate = new Date(createdAt);
      endDate.setDate(createdAt.getDate() + totalDays);
      
      const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      
      return {
        ...sub,
        end_date: endDate.toISOString().split('T')[0],
        remaining_days: remainingDays,
        is_expired: remainingDays === 0
      };
    });

    res.json({ 
      hasActiveSubscription: true,
      activeSubscriptions: subscriptionsWithRemaining
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// Create new subscription
app.post('/api/subscriptions', async (req, res) => {
  try {
    const {
      username,
      subscription_type,
      duration,
      amount,
      address,
      building_name,
      flat_number,
      payment_id,
      latitude,
      longitude
    } = req.body;

    // Enhanced validation for all required fields
    if (!username || !subscription_type || !duration || !amount || !address || !building_name || !flat_number || !payment_id) {
      return res.status(400).json({ 
        error: 'All fields are required',
        missingFields: {
          username: !username,
          subscription_type: !subscription_type,
          duration: !duration,
          amount: !amount,
          address: !address,
          building_name: !building_name,
          flat_number: !flat_number,
          payment_id: !payment_id
        }
      });
    }

    // Validate payment_id format
    if (!payment_id.startsWith('pay_')) {
      return res.status(400).json({ error: 'Invalid payment ID format' });
    }

    // Validate amount is a positive number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Validate latitude and longitude
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid location coordinates' });
    }

    // Validate and sanitize address fields using address-utils
    if (!validateAddress(address) || !validateBuildingName(building_name) || !validateFlatNumber(flat_number)) {
      return res.status(400).json({ error: 'Invalid address, building name, or flat number format' });
    }
    const sanitizedAddress = sanitizeAddress(address);
    const sanitizedBuildingName = sanitizeBuildingName(building_name);
    const sanitizedFlatNumber = sanitizeFlatNumber(flat_number);

    // Verify Razorpay payment
    try {
      await verifyPayment(payment_id, Math.round(numericAmount * 100));
    } catch (paymentError) {
      console.error('Payment verification failed:', paymentError.message);
      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: paymentError.message
      });
    }

    // Allow multiple subscriptions - check for overlapping active subscriptions
    const [existingSubscriptions] = await db.execute(
      'SELECT id, subscription_type, duration, status, created_at FROM subscriptions WHERE username = ? AND status IN ("active", "inactive") ORDER BY created_at DESC',
      [username]
    );

    // Check for overlapping subscriptions of the same type
    const sameTypeActive = existingSubscriptions.filter(sub => 
      sub.subscription_type === subscription_type && sub.status === 'active'
    );

    if (sameTypeActive.length > 0) {
      return res.status(409).json({ 
        error: `You already have an active ${subscription_type} subscription. Please manage your existing subscription or wait for it to expire.`,
        existingSubscription: sameTypeActive[0]
      });
    }

    const [result] = await db.execute(
      'INSERT INTO subscriptions (username, subscription_type, duration, amount, address, building_name, flat_number, payment_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, subscription_type, duration, numericAmount, sanitizedAddress, sanitizedBuildingName, sanitizedFlatNumber, payment_id, lat, lng]
    );

    res.json({
      success: true,
      message: 'Subscription created successfully',
      subscription_id: result.insertId
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message
    });
  }
});

// ===== ADMIN AUTHENTICATION MIDDLEWARE =====
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Enhanced token validation
    const username = req.headers['x-username'] || req.headers['X-Username'];
    if (!username) {
      return res.status(401).json({ error: 'Username required' });
    }

    // Check if user exists and has admin role
    const [users] = await db.execute(
      'SELECT id, username, email, role FROM users WHERE username = ? AND role = "admin"',
      [username]
    );

    if (users.length === 0) {
      console.error(`Admin access denied for username: ${username}`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify token format (simplified for demo)
    if (!token.startsWith('admin-token-')) {
      console.error(`Invalid token format for username: ${username}`);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

// ===== ADMIN PAGE PROTECTION MIDDLEWARE =====
const protectAdminPages = async (req, res, next) => {
  // Only protect admin HTML pages
  if (req.path.startsWith('/admin') && req.path.endsWith('.html')) {
    const token = req.query.token || req.headers['x-access-token'];
    const username = req.query.username || req.headers['x-username'];
    
    if (!token || !username) {
      return res.redirect('/admin-login.html');
    }

    try {
      const [users] = await db.execute(
        'SELECT id, username, role FROM users WHERE username = ? AND role = "admin"',
        [username]
      );

      if (users.length === 0) {
        return res.redirect('/admin-login.html');
      }

      // Token validation (simplified for demo)
      if (!token.startsWith('admin-token-')) {
        return res.redirect('/admin-login.html');
      }

      // Valid admin, allow access
      next();
    } catch (error) {
      console.error('Admin page protection error:', error);
      return res.redirect('/admin-login.html');
    }
  } else {
    // Not an admin page, continue normally
    next();
  }
};

// Apply admin protection middleware
app.use(protectAdminPages);

// ===== USER AUTHENTICATION ENDPOINTS =====

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

app.put('/api/subscriptions/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, reason } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    console.log(`Attempting to pause subscription ${id} for user ${username}`);

    // Verify the subscription belongs to the user
    const [subscriptions] = await db.execute(
      'SELECT id, status, subscription_type FROM subscriptions WHERE id = ? AND username = ?',
      [id, username]
    );

    if (subscriptions.length === 0) {
      console.log(`Subscription ${id} not found for user ${username}`);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptions[0];
    console.log(`Found subscription: ${JSON.stringify(subscription)}`);
    
    if (subscription.status !== 'active') {
      console.log(`Cannot pause subscription ${id} - current status is ${subscription.status}`);
      return res.status(400).json({ 
        error: `Cannot pause subscription with status: ${subscription.status}. Only active subscriptions can be paused.` 
      });
    }

    // Record status change in history
    await db.execute(
      'INSERT INTO subscription_status_history (subscription_id, old_status, new_status, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
      [id, 'active', 'inactive', username, reason || 'User requested pause']
    );

    // Update subscription status
    const [result] = await db.execute(
      'UPDATE subscriptions SET status = "inactive", paused_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    console.log(`Subscription ${id} paused successfully. Rows affected: ${result.affectedRows}`);

    res.json({ 
      success: true, 
      message: 'Subscription paused successfully',
      subscription_id: id,
      new_status: 'inactive',
      paused_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({ error: 'Failed to pause subscription', details: error.message });
  }
});

// Resume subscription
app.put('/api/subscriptions/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, reason } = req.body;

    // Verify the subscription belongs to the user
    const [subscriptions] = await db.execute(
      'SELECT id, status, paused_at FROM subscriptions WHERE id = ? AND username = ?',
      [id, username]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptions[0];
    
    if (subscription.status !== 'inactive') {
      return res.status(400).json({ error: 'Only paused subscriptions can be resumed' });
    }

    // Calculate paused duration
    const pausedDuration = subscription.paused_at ? 
      Math.floor((Date.now() - new Date(subscription.paused_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Record status change in history
    await db.execute(
      'INSERT INTO subscription_status_history (subscription_id, old_status, new_status, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
      [id, 'inactive', 'active', username, reason || 'User requested resume']
    );

    // Update subscription status and calculate total paused days
    await db.execute(
      'UPDATE subscriptions SET status = "active", resumed_at = CURRENT_TIMESTAMP, total_paused_days = total_paused_days + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pausedDuration, id]
    );

    res.json({ 
      success: true, 
      message: 'Subscription resumed successfully',
      subscription_id: id,
      new_status: 'active',
      resumed_at: new Date().toISOString(),
      paused_duration_days: pausedDuration
    });

  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// Get subscription status history
app.get('/api/subscriptions/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.query;

    // Verify the subscription belongs to the user
    const [subscriptions] = await db.execute(
      'SELECT id FROM subscriptions WHERE id = ? AND username = ?',
      [id, username]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const [history] = await db.execute(
      'SELECT id, old_status, new_status, changed_by, change_reason, created_at FROM subscription_status_history WHERE subscription_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({ 
      success: true,
      history: history.map(record => ({
        ...record,
        created_at: record.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({ error: 'Failed to fetch subscription history' });
  }
});

// Cancel subscription
app.put('/api/subscriptions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // For admin operations, we don't need to verify ownership
    const [subscriptions] = await db.execute(
      'SELECT id, status FROM subscriptions WHERE id = ?',
      [id]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = subscriptions[0];
    
    if (subscription.status === 'cancelled') {
      return res.status(400).json({ error: 'Subscription is already cancelled' });
    }

    await db.execute(
      'UPDATE subscriptions SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({ 
      success: true, 
      message: 'Subscription cancelled successfully',
      subscription_id: id,
      new_status: 'cancelled'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ===== EXISTING ENDPOINTS =====

// Get subscription remaining days
app.get('/api/subscriptions/remaining/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Include both active and inactive subscriptions for pause/resume functionality
    const [subscriptions] = await db.execute(
      'SELECT id, subscription_type, duration, amount, status, created_at FROM subscriptions WHERE username = ? AND status IN ("active", "inactive") ORDER BY created_at DESC',
      [username]
    );

    if (subscriptions.length === 0) {
      return res.json({ 
        hasActiveSubscription: false,
        remainingDays: 0,
        message: 'No active subscription found'
      });
    }

    const subscription = subscriptions[0];
    
    // Calculate remaining days
    const createdAt = new Date(subscription.created_at);
    const now = new Date();
    
    // Parse duration (e.g., "6 days", "15 days")
    const durationMatch = subscription.duration.match(/(\d+)\s*days?/i);
    if (!durationMatch) {
      return res.status(400).json({ error: 'Invalid duration format' });
    }
    
    const totalDays = parseInt(durationMatch[1]);
    const endDate = new Date(createdAt);
    endDate.setDate(createdAt.getDate() + totalDays);
    
    const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    const isExpired = remainingDays === 0;

    res.json({
      hasActiveSubscription: true,
      subscription: {
        id: subscription.id,
        subscription_type: subscription.subscription_type,
        duration: subscription.duration,
        amount: subscription.amount,
        created_at: subscription.created_at,
        end_date: endDate.toISOString().split('T')[0],
        remaining_days: remainingDays,
        is_expired: isExpired,
        status: isExpired ? 'expired' : subscription.status
      }
    });

  } catch (error) {
    console.error('Error calculating remaining days:', error);
    res.status(500).json({ error: 'Failed to calculate remaining days' });
  }
});

// Check subscription status
app.get('/api/subscriptions/check/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const [activeSubscriptions] = await db.execute(
      'SELECT id, subscription_type, duration, amount, status, created_at FROM subscriptions WHERE username = ? AND status = "active"',
      [username]
    );

    if (activeSubscriptions.length === 0) {
      return res.json({ 
        hasActiveSubscription: false,
        activeSubscriptions: []
      });
    }

    // Calculate remaining days for each subscription
    const subscriptionsWithRemaining = activeSubscriptions.map(sub => {
      const createdAt = new Date(sub.created_at);
      const now = new Date();
      
      const durationMatch = sub.duration.match(/(\d+)\s*days?/i);
      const totalDays = durationMatch ? parseInt(durationMatch[1]) : 0;
      
      const endDate = new Date(createdAt);
      endDate.setDate(createdAt.getDate() + totalDays);
      
      const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      
      return {
        ...sub,
        end_date: endDate.toISOString().split('T')[0],
        remaining_days: remainingDays,
        is_expired: remainingDays === 0
      };
    });

    res.json({ 
      hasActiveSubscription: true,
      activeSubscriptions: subscriptionsWithRemaining
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// Create new subscription
app.post('/api/subscriptions', async (req, res) => {
  try {
    const {
      username,
      subscription_type,
      duration,
      amount,
      address,
      building_name,
      flat_number,
      payment_id,
      latitude,
      longitude
    } = req.body;

    // Enhanced validation for all required fields
    if (!username || !subscription_type || !duration || !amount || !address || !building_name || !flat_number || !payment_id) {
      return res.status(400).json({ 
        error: 'All fields are required',
        missingFields: {
          username: !username,
          subscription_type: !subscription_type,
          duration: !duration,
          amount: !amount,
          address: !address,
          building_name: !building_name,
          flat_number: !flat_number,
          payment_id: !payment_id
        }
      });
    }

    // Validate payment_id format
    if (!payment_id.startsWith('pay_')) {
      return res.status(400).json({ error: 'Invalid payment ID format' });
    }

    // Validate amount is a positive number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Validate latitude and longitude
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid location coordinates' });
    }

    // Validate and sanitize address fields using address-utils
    if (!validateAddress(address) || !validateBuildingName(building_name) || !validateFlatNumber(flat_number)) {
      return res.status(400).json({ error: 'Invalid address, building name, or flat number format' });
    }
    const sanitizedAddress = sanitizeAddress(address);
    const sanitizedBuildingName = sanitizeBuildingName(building_name);
    const sanitizedFlatNumber = sanitizeFlatNumber(flat_number);

    // Verify Razorpay payment
    try {
      await verifyPayment(payment_id, Math.round(numericAmount * 100));
    } catch (paymentError) {
      console.error('Payment verification failed:', paymentError.message);
      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: paymentError.message
      });
    }

    // Allow multiple subscriptions - check for overlapping active subscriptions
    const [existingSubscriptions] = await db.execute(
      'SELECT id, subscription_type, duration, status, created_at FROM subscriptions WHERE username = ? AND status IN ("active", "inactive") ORDER BY created_at DESC',
      [username]
    );

    // Check for overlapping subscriptions of the same type
    const sameTypeActive = existingSubscriptions.filter(sub => 
      sub.subscription_type === subscription_type && sub.status === 'active'
    );

    if (sameTypeActive.length > 0) {
      return res.status(409).json({ 
        error: `You already have an active ${subscription_type} subscription. Please manage your existing subscription or wait for it to expire.`,
        existingSubscription: sameTypeActive[0]
      });
    }

    const [result] = await db.execute(
      'INSERT INTO subscriptions (username, subscription_type, duration, amount, address, building_name, flat_number, payment_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, subscription_type, duration, numericAmount, sanitizedAddress, sanitizedBuildingName, sanitizedFlatNumber, payment_id, lat, lng]
    );

    res.json({
      success: true,
      message: 'Subscription created successfully',
      subscription_id: result.insertId
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message
    });
  }
});

// ===== ADMIN AUTHENTICATION MIDDLEWARE =====
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Enhanced token validation
    const username = req.headers['x-username'] || req.headers['X-Username'];
    if (!username) {
      return res.status(401).json({ error: 'Username required' });
    }

    // Check if user exists and has admin role
    const [users] = await db.execute(
      'SELECT id, username, email, role FROM users WHERE username = ? AND role = "admin"',
      [username]
    );

    if (users.length === 0) {
      console.error(`Admin access denied for username: ${username}`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify token format (simplified for demo)
    if (!token.startsWith('admin-token-')) {
      console.error(`Invalid token format for username: ${username}`);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

// ===== ADMIN PAGE PROTECTION MIDDLEWARE =====
const protectAdminPages = async (req, res, next) => {
  // Only protect admin HTML pages
  if (req.path.startsWith('/admin') && req.path.endsWith('.html')) {
    const token = req.query.token || req.headers['x-access-token'];
    const username = req.query.username || req.headers['x-username'];
    
    if (!token || !username) {
      return res.redirect('/admin-login.html');
    }

    try {
      const [users] = await db.execute(
        'SELECT id, username, role FROM users WHERE username = ? AND role = "admin"',
        [username]
      );

      if (users.length === 0) {
        return res.redirect('/admin-login.html');
      }

      // Token validation (simplified for demo)
      if (!token.startsWith('admin-token-')) {
        return res.redirect('/admin-login.html');
      }

      // Valid admin, allow access
      next();
    } catch (error) {
      console.error('Admin page protection error:', error);
      return res.redirect('/admin-login.html');
    }
  } else {
    // Not an admin page, continue normally
    next();
  }
};

// Apply admin protection middleware
app.use(protectAdminPages);

// ===== USER AUTHENTICATION ENDPOINTS =====

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await db.execute(
      'SELECT id, username, password, email, phone, address, role, created_at FROM users WHERE username = ? OR email = ? OR phone = ?',
      [username, username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    
    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token (you would use jsonwebtoken here)
    const token = 'demo-token-' + Date.now();

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// User registration route - frontend compatible endpoint
app.post('/api/users', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  console.log(`[${requestId}] Registration attempt started`);
  
  try {
    const { username, password, email, phone, address, name } = req.body;
    
    // Log request details (without sensitive data)
    console.log(`[${requestId}] Registration data received:`, {
      username: username || 'missing',
      email: email || 'missing',
      phone: phone || 'not provided',
      name: name || 'not provided'
    });

    // Enhanced validation with detailed logging
    if (!username || !password || !email) {
      console.log(`[${requestId}] Validation failed: missing required fields`);
      return res.status(400).json({ 
        error: 'Username, password, and email are required',
        code: 'MISSING_FIELDS',
        missingFields: {
          username: !username,
          password: !password,
          email: !email
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`[${requestId}] Validation failed: invalid email format`);
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        code: 'INVALID_EMAIL',
        received: email
      });
    }

    // Username validation removed - any format allowed

    // Validate password strength
    if (password.length < 6) {
      console.log(`[${requestId}] Validation failed: weak password`);
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD',
        length: password.length
      });
    }

    // Check if user already exists with detailed error
    console.log(`[${requestId}] Checking for existing user...`);
    
    const [existingUsername] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsername.length > 0) {
      console.log(`[${requestId}] Username already exists: ${username}`);
      return res.status(409).json({ 
        error: 'Username already taken',
        code: 'USERNAME_EXISTS',
        username: username
      });
    }

    const [existingEmail] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingEmail.length > 0) {
      console.log(`[${requestId}] Email already registered: ${email}`);
      return res.status(409).json({ 
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
        email: email
      });
    }

    // Hash password with salt rounds
    console.log(`[${requestId}] Hashing password...`);
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert new user with transaction
    console.log(`[${requestId}] Creating new user...`);
    const [result] = await db.execute(
      'INSERT INTO users (username, password, email, phone, address, name) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, email, phone || null, address || null, name || null]
    );

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ✅ User registered successfully in ${duration}ms`);
    
    res.json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId,
      username: username,
      requestId: requestId
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Registration error:`, {
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: duration + 'ms'
    });
    
    res.status(500).json({ 
      error: 'Registration failed due to server error',
      code: 'SERVER_ERROR',
      details: error.message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// Get user profile
app.get('/api/profile', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ 
        error: 'Username parameter is required',
        code: 'MISSING_USERNAME',
        message: 'Please provide a username to fetch profile'
      });
    }

    const [users] = await db.execute(
      'SELECT id, username, name, email, phone, created_at FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'User profile not found',
        code: 'USER_NOT_FOUND',
        message: 'User does not exist in the system. Please register first.'
      });
    }

    const user = users[0];

    // Fetch latest active subscription address for the user
    const [subscriptions] = await db.execute(
      'SELECT address, building_name, flat_number FROM subscriptions WHERE username = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
      [username]
    );

    let subscriptionAddress = null;
    if (subscriptions.length > 0) {
      subscriptionAddress = subscriptions[0];
    }

    const profileResponse = {
      id: user.id,
      name: user.name || user.username,
      email: user.email,
      phone: user.phone || '',
      created_at: user.created_at,
      profile_complete: !!(user.name && user.email),
      subscription_address: subscriptionAddress ? subscriptionAddress.address : null,
      subscription_building_name: subscriptionAddress ? subscriptionAddress.building_name : null,
      subscription_flat_number: subscriptionAddress ? subscriptionAddress.flat_number : null
    };

    res.json(profileResponse);

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred while loading your profile'
    });
  }
});

// Update user profile
app.put('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { name, email, phone, street, city, state, zip } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const values = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      values.push(phone);
    }
    if (street !== undefined) {
      updateFields.push('street = ?');
      values.push(street);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      updateFields.push('state = ?');
      values.push(state);
    }
    if (zip !== undefined) {
      updateFields.push('zip = ?');
      values.push(zip);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(username);

    const [result] = await db.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE username = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ===== ADMIN ENDPOINTS =====

// Get all subscriptions (admin only)
app.get('/api/admin/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    console.log(`Admin ${req.user.username} is fetching all subscriptions`);
    
    const [subscriptions] = await db.execute(
      'SELECT id, username, subscription_type, duration, amount, address, building_name, flat_number, latitude, longitude, status, created_at, updated_at FROM subscriptions ORDER BY created_at DESC'
    );

    console.log(`Found ${subscriptions.length} subscriptions`);
    
    // Ensure we always return an array, even if empty
    res.json({ 
      success: true,
      subscriptions: subscriptions || [],
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch subscriptions',
      details: error.message 
    });
  }
});

// Admin login check
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await db.execute(
      'SELECT id, username, password, email, name, role FROM users WHERE (username = ? OR email = ?) AND role = "admin"',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate a simple token for the admin session
    const token = 'admin-token-' + Date.now();

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Check admin status
app.get('/api/admin/check', authenticateAdmin, (req, res) => {
  res.json({ 
    success: true, 
    isAdmin: true,
    user: req.user 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
