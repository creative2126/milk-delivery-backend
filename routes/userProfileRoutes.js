const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [userRows] = await db.query(
            'SELECT id, name, email, phone, address, profile_picture, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userRows[0];
        
        // Get subscription info
        const [subscriptionRows] = await db.query(
            'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        
        // Get recent orders
        const [orderRows] = await db.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [userId]
        );
        
        // Get payment methods
        const [paymentRows] = await db.query(
            'SELECT * FROM payment_methods WHERE user_id = ? AND is_active = 1',
            [userId]
        );
        
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                profilePicture: user.profile_picture,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            },
            subscription: subscriptionRows[0] || null,
            recentOrders: orderRows,
            paymentMethods: paymentRows
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { name, email, phone, address } = req.body;
        
        await db.query(
            'UPDATE users SET name = ?, email = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
            [name, email, phone, address, userId]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upload profile picture
router.post('/profile/:userId/upload-picture', upload.single('profilePicture'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const filePath = req.file ? `/uploads/profiles/${req.file.filename}` : null;
        
        if (!filePath) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Update user profile picture in database
        await db.query(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [filePath, userId]
        );
        
        res.json({ 
            message: 'Profile picture uploaded successfully',
            profilePicture: filePath
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change password
router.post('/profile/:userId/change-password', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { currentPassword, newPassword } = req.body;
        
        // Verify current password (implement proper password verification)
        const [userRows] = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // In a real app, use bcrypt to compare passwords
        // For now, we'll assume the password is correct
        // const isValid = await bcrypt.compare(currentPassword, userRows[0].password);
        
        // Update password (implement proper password hashing)
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [newPassword, userId] // In production, hash the password
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get login activity
router.get('/profile/:userId/activity', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const [activityRows] = await db.query(
            'SELECT * FROM login_activity WHERE user_id = ? ORDER BY login_time DESC LIMIT 10',
            [userId]
        );
        
        res.json({ activities: activityRows });
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add payment method
router.post('/profile/:userId/payment-methods', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { cardNumber, cardHolder, expiryDate, isDefault } = req.body;
        
        // In production, use proper payment tokenization
        const maskedCard = `**** **** **** ${cardNumber.slice(-4)}`;
        
        await db.query(
            'INSERT INTO payment_methods (user_id, masked_card, card_holder, expiry_date, is_default, is_active) VALUES (?, ?, ?, ?, ?, 1)',
            [userId, maskedCard, cardHolder, expiryDate, isDefault || false]
        );
        
        res.json({ message: 'Payment method added successfully' });
    } catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
