// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Your database connection module
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// ================= LOGIN ROUTE =================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) 
      return res.status(400).json({ success: false, error: 'Email/Username and password required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [username, username]);
    if (!rows || rows.length === 0) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const user = rows[0];
    if (!user.password) return res.status(500).json({ success: false, error: 'User record incomplete' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ================= PROFILE ROUTE =================
router.get('/profile', async (req, res) => {
  try {
    const usernameOrEmail = req.query.username;
    if (!usernameOrEmail) return res.status(400).json({ error: 'Username is required' });

    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ? OR name = ?',
      [usernameOrEmail, usernameOrEmail, usernameOrEmail]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ================= UPDATE USER ADDRESS =================
router.put('/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const { street, city, state, zip } = req.body;
    if (!street || !city || !state || !zip) return res.status(400).json({ error: 'All address fields are required' });

    const fullAddress = `${street}, ${city}, ${state}, ${zip}`;
    const geo = await geocodeAddress(fullAddress);

    const [result] = await db.query(
      `UPDATE users SET street=?, city=?, state=?, zip=?, latitude=?, longitude=? WHERE username=?`,
      [street, city, state, zip, geo?.latitude || null, geo?.longitude || null, username]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, message: 'Address updated successfully', latitude: geo?.latitude, longitude: geo?.longitude });
  } catch (error) {
    console.error('Error updating user address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// ================= HELPER FUNCTION =================
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'MilkDeliveryApp/1.0' } });
    const data = await response.json();
    if (data && data.length > 0) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return null;
}

module.exports = router;
