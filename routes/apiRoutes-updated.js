const express = require('express');
const router = express.Router();
const db = require('../db');
const queryOptimizer = require('../utils/queryOptimizer');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const fetch = require('node-fetch');
console.log('==== apiRoutes.js router LOADED ====');

// Helper function to geocode address to lat/lng using OpenStreetMap Nominatim API
async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MilkDeliveryApp/1.0 (your-email@example.com)'
            }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return null;
}

// API endpoint for profile by username
router.get('/profile', cacheMiddleware.cacheUserData(600), async (req, res) => {
    console.log('==== /api/profile route handler STARTED ====');
    console.log('Request query:', req.query);
    try {
        const usernameOrEmail = req.query.username;
        console.log('Profile fetch requested for:', usernameOrEmail);
        if (!usernameOrEmail) {
            return res.status(400).json({ error: 'Username is required' });
        }
        // Query user by username OR email OR name
        const query = 'SELECT * FROM users WHERE username = ? OR email = ? OR name = ?';
        const userData = await db.query(query, [usernameOrEmail, usernameOrEmail, usernameOrEmail]);
        console.log('Profile query result:', userData);
        if (!userData || userData.length === 0) {
            console.log('User not found for:', usernameOrEmail);
            return res.status(404).json({ error: 'User not found' });
        }
        // Fill missing fields with 'NA'
        const user = userData[0];
        const safeUser = {
            name: user.name || 'NA',
            username: user.username || 'NA',
            email: user.email || 'NA',
            phone: user.phone || 'NA',
            street: user.street || 'NA',
            city: user.city || 'NA',
            state: user.state || 'NA',
            zip: user.zip || 'NA',
            latitude: user.latitude || null,
            longitude: user.longitude || null,
            created_at: user.created_at || 'NA',
            updated_at: user.updated_at || 'NA'
        };

        // Get subscription data directly from users table (merged structure)
        const userWithSubscription = {
            ...safeUser,
            subscription_type: user.subscription_type || null,
            subscription_duration: user.subscription_duration || null,
            subscription_status: user.subscription_status || null,
            subscription_start_date: user.subscription_start_date || null,
            subscription_end_date: user.subscription_end_date || null,
            subscription_address: user.subscription_address || null,
            subscription_building_name: user.subscription_building_name || null,
            subscription_flat_number: user.subscription_flat_number || null,
            subscription_amount: user.subscription_amount || null,
            subscription_payment_id: user.subscription_payment_id || null,
            subscription_created_at: user.subscription_created_at || null,
            subscription_updated_at: user.subscription_updated_at || null,
            remaining_days: user.subscription_end_date ? Math.ceil((new Date(user.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
        };

        const response = {
            user: userWithSubscription,
            subscription: userWithSubscription, // Keep for backward compatibility
            cache: true,
            timestamp: new Date().toISOString()
        };
        res.json(response);
    } catch (error) {
        console.error('Profile fetch error:', error.stack || error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// PUT route to update user address and geocode lat/lng
router.put('/users/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const { street, city, state, zip } = req.body;

        if (!street || !city || !state || !zip) {
            return res.status(400).json({ error: 'All address fields are required' });
        }

        const fullAddress = `${street}, ${city}, ${state}, ${zip}`;
        const geo = await geocodeAddress(fullAddress);

        let latitude = null;
        let longitude = null;
        if (geo) {
            latitude = geo.latitude;
            longitude = geo.longitude;
        }

        const updateQuery = `
            UPDATE users
            SET street = ?, city = ?, state = ?, zip = ?, latitude = ?, longitude = ?
            WHERE username = ?
        `;

        const result = await db.query(updateQuery, [street, city, state, zip, latitude, longitude, username]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, message: 'Address updated successfully', latitude, longitude });
    } catch (error) {
        console.error('Error updating user address:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

router.get('/subscriptions/remaining/:username', cacheMiddleware.cacheUserData(300), async (req, res) => {
    try {
        const username = req.params.username;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Get subscription data directly from users table (merged structure)
        const query = `
            SELECT
                subscription_type,
                subscription_duration,
                subscription_created_at as created_at,
                subscription_end_date as end_date,
                subscription_status as status,
                CASE
                    WHEN subscription_end_date IS NOT NULL
                    THEN DATEDIFF(subscription_end_date, CURDATE())
                    ELSE NULL
                END as remaining_days
            FROM users
            WHERE username = ? AND subscription_status IN ('active', 'paused', 'expired')
            LIMIT 1
        `;

        const subscriptions = await db.query(query, [username]);
        console.log('Subscriptions query result for username', username, ':', subscriptions);

        const sub = subscriptions.length > 0 ? subscriptions[0] : null;

        const response = {
            hasActiveSubscription: sub ? (sub.status === 'active' || sub.status === 'paused' || sub.status === 'expired') : false,
            subscription: sub,
            cache: true,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error('Subscriptions remaining error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
});

// API endpoint for user subscriptions summary
router.get('/api/subscriptions/summary/:username', cacheMiddleware.cacheUserData(300), async (req, res) => {
    try {
        const username = req.params.username;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Get user data with subscription info from merged table
        const userResult = await db.query(
            'SELECT id, username, subscription_status, subscription_amount FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (!userResult || userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult[0];

        // Get subscription summary from users table
        const summaryQuery = `
            SELECT
                COUNT(*) as total_subscriptions,
                SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                SUM(CASE WHEN subscription_status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
                SUM(CASE WHEN subscription_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
                SUM(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE 0 END) as total_active_value,
                AVG(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE NULL END) as avg_subscription_value
            FROM users
            WHERE id = ?
        `;

        const [summary] = await db.query(summaryQuery, [user.id]);

        // Get upcoming renewals from users table
        const renewalsQuery = `
            SELECT
                id,
                subscription_type as product_name,
                subscription_end_date as renewal_date,
                DATEDIFF(subscription_end_date, CURDATE()) as days_until_renewal,
                subscription_amount as renewal_amount
            FROM users
            WHERE id = ?
                AND subscription_status = 'active'
                AND subscription_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY subscription_end_date ASC
        `;

        const [upcomingRenewals] = await db.query(renewalsQuery, [user.id]);

        const response = {
            username,
            summary: summary[0],
            upcomingRenewals: upcomingRenewals.map(renewal => ({
                subscriptionId: renewal.id,
                productName: renewal.product_name,
                renewalDate: renewal.renewal_date,
                daysUntilRenewal: renewal.days_until_renewal,
                renewalAmount: renewal.renewal_amount
            })),
            cache: true,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error('Subscriptions summary error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription summary' });
    }
});

module.exports = router;
