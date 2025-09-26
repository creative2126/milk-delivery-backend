const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = require('node-fetch');

console.log('✅ API Routes Loaded');

// 📍 Helper: Geocode Address (Optional)
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'MilkDeliveryApp/1.0' } });
    const data = await response.json();
    if (data?.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error('🌍 Geocoding error:', error.message);
  }
  return null;
}

// =============================
// 📌 1️⃣ GET USER PROFILE
// =============================
router.get('/profile', async (req, res) => {
  console.log('➡️ /api/profile hit:', req.query);
  try {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const query = `SELECT * FROM users WHERE username = ? OR email = ? OR name = ?`;
    const users = await db.query(query, [username, username, username]);

    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];

    // ✅ Calculate remaining days if subscription_end_date exists
    let remainingDays = null;
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const today = new Date();
      remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    }

    // 📦 Build response object
    const response = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.subscription_address || null,
        subscription: {
          type: user.subscription_type || null,
          duration: user.subscription_duration || null,
          status: user.subscription_status || 'inactive',
          start_date: user.subscription_start_date || null,
          end_date: user.subscription_end_date || null,
          remaining_days: remainingDays,
          amount: user.subscription_amount || null,
          building_name: user.subscription_building_name || null,
          flat_number: user.subscription_flat_number || null,
          payment_id: user.subscription_payment_id || null,
          paused_at: user.paused_at || null,
          resumed_at: user.resumed_at || null,
          total_paused_days: user.total_paused_days || 0
        }
      }
    };

    return res.json(response);
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

// =============================
// 📌 2️⃣ GET REMAINING SUBSCRIPTION DAYS
// =============================
router.get('/subscriptions/remaining/:username', async (req, res) => {
  console.log('➡️ /subscriptions/remaining called for:', req.params.username);
  try {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const query = `SELECT * FROM users WHERE username = ? OR email = ? OR name = ?`;
    const users = await db.query(query, [username, username, username]);

    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];

    let remainingDays = 0;
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const today = new Date();
      remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    }

    return res.json({
      username: user.username,
      hasActiveSubscription: user.subscription_status === 'active',
      subscription: {
        type: user.subscription_type,
        duration: user.subscription_duration,
        status: user.subscription_status,
        start_date: user.subscription_start_date,
        end_date: user.subscription_end_date,
        remaining_days: remainingDays
      }
    });
  } catch (err) {
    console.error('❌ Remaining subscription fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch remaining subscription', details: err.message });
  }
});

// =============================
// 📌 3️⃣ SUBSCRIPTION SUMMARY
// =============================
router.get('/subscriptions/summary/:username', async (req, res) => {
  console.log('➡️ /subscriptions/summary called for:', req.params.username);
  try {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const query = `SELECT * FROM users WHERE username = ? OR email = ? OR name = ?`;
    const users = await db.query(query, [username, username, username]);

    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];

    let remainingDays = 0;
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const today = new Date();
      remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    }

    return res.json({
      username: user.username,
      summary: {
        subscription_type: user.subscription_type,
        subscription_status: user.subscription_status,
        total_days: user.subscription_duration,
        remaining_days: remainingDays,
        amount: user.subscription_amount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Subscription summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch subscription summary', details: err.message });
  }
});

module.exports = router;
