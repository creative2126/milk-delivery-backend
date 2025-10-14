// routes/apiRoutes.js - Fixed for Existing Table Structure
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// ================= REGISTER ROUTE =================
router.post('/users', async (req, res) => {
  try {
    const { name, email, phone, password, username } = req.body;
    
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, phone, and password are required' 
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, email]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with all required fields
    const [result] = await db.query(
      `INSERT INTO users (name, email, username, phone, password, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, email, phone, hashedPassword, 'user']
    );

    console.log('✓ User registered:', email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        name,
        email,
        phone,
        username: email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during registration',
      details: error.message
    });
  }
});

// ================= LOGIN ROUTE - FIXED FOR EXISTING TABLE =================
router.post('/login', async (req, res) => {
  try {
    // Accept multiple field names
    const { email, username, phone, password, emailOrPhone } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password is required' 
      });
    }

    // Determine which field to use for search
    const searchValue = email || username || phone || emailOrPhone;
    
    if (!searchValue) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, username, or phone is required' 
      });
    }

    console.log('Login attempt with:', searchValue);

    // Query database - search by email, username, or phone
    const [rows] = await db.query(
      `SELECT id, username, email, password, name, phone, role 
       FROM users 
       WHERE email = ? OR username = ? OR phone = ?
       LIMIT 1`,
      [searchValue, searchValue, searchValue]
    );

    console.log('Query result rows:', rows);

    if (!rows || rows.length === 0) {
      console.log('❌ Login failed: User not found -', searchValue);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const user = rows[0];
    console.log('User found:', { id: user.id, email: user.email, hasPassword: !!user.password });

    // Check if password exists
    if (!user.password) {
      console.error('❌ User has no password stored:', user.email);
      return res.status(500).json({ 
        success: false, 
        error: 'Account not properly configured. Please contact support.' 
      });
    }

    // Ensure password is a string
    const storedPasswordHash = String(user.password).trim();
    console.log('Comparing passwords...');
    console.log('Stored hash length:', storedPasswordHash.length);
    console.log('Stored hash starts with:', storedPasswordHash.substring(0, 10));

    // Compare password with hash
    let match = false;
    try {
      match = await bcrypt.compare(password, storedPasswordHash);
      console.log('Password comparison result:', match);
    } catch (bcryptError) {
      console.error('❌ Bcrypt error:', bcryptError.message);
      console.error('Stored hash:', storedPasswordHash);
      return res.status(500).json({ 
        success: false, 
        error: 'Password verification failed: ' + bcryptError.message
      });
    }
    
    if (!match) {
      console.log('❌ Login failed: Invalid password for', user.email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    console.log('✓ Password verified for', user.email);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    console.log('✓ User logged in:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role || 'user'
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: error.message 
    });
  }
});

// ================= PROFILE ROUTE =================
router.get('/profile', async (req, res) => {
  try {
    const usernameOrEmail = req.query.username || req.query.email || req.query.id;
    
    if (!usernameOrEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'Username, email, or ID is required' 
      });
    }

    let query = `SELECT id, username, email, name, phone, address, city, state, zip, 
                 subscription_type, subscription_status, role, created_at 
                 FROM users WHERE`;
    let params = [];

    // Check if it's a number (ID) or string (username/email)
    if (!isNaN(usernameOrEmail)) {
      query += ` id = ?`;
      params = [usernameOrEmail];
    } else {
      query += ` username = ? OR email = ? OR name = ?`;
      params = [usernameOrEmail, usernameOrEmail, usernameOrEmail];
    }

    const [rows] = await db.query(query, params);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = rows[0];
    
    res.json({ 
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user profile',
      details: error.message 
    });
  }
});

// ================= UPDATE USER ADDRESS =================
router.put('/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const { street, city, state, zip } = req.body;
    
    if (!street || !city || !state || !zip) {
      return res.status(400).json({ 
        success: false,
        error: 'All address fields are required' 
      });
    }

    const fullAddress = `${street}, ${city}, ${state}, ${zip}`;
    const geo = await geocodeAddress(fullAddress);

    const [result] = await db.query(
      `UPDATE users SET street=?, city=?, state=?, zip=?, latitude=?, longitude=? 
       WHERE username=?`,
      [street, city, state, zip, geo?.latitude || null, geo?.longitude || null, username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Address updated successfully', 
      latitude: geo?.latitude, 
      longitude: geo?.longitude 
    });
  } catch (error) {
    console.error('Error updating user address:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update address',
      details: error.message 
    });
  }
});

// ================= UPDATE USER PROFILE =================
router.put('/profile', async (req, res) => {
  try {
    const { userId, name, phone, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No fields to update' 
      });
    }

    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile',
      details: error.message 
    });
  }
});

// ================= RESET PASSWORD =================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and new password are required' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    console.log('✓ Password reset for:', email);

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset password',
      details: error.message 
    });
  }
});

// ================= HELPER FUNCTION =================
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'MilkDeliveryApp/1.0' } 
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      return { 
        latitude: parseFloat(data[0].lat), 
        longitude: parseFloat(data[0].lon) 
      };
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return null;
}

module.exports = router;
