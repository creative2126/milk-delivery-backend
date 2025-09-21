

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

        // Fetch user_id for subscription query
        const userId = user.id;

        // Fetch most recent subscription for the user by username
        const subscriptionQuery = `
            SELECT s.*, DATEDIFF(s.end_date, CURDATE()) as remaining_days
            FROM subscriptions s
            WHERE s.username = ?
            ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC,
                     CASE WHEN s.status = 'paused' THEN 1 ELSE 0 END DESC,
                     s.created_at DESC
            LIMIT 1
        `;
        const subscriptionData = await db.query(subscriptionQuery, [user.username]);
        let subscription = null;
        if (Array.isArray(subscriptionData) && subscriptionData.length > 0) {
            if (Array.isArray(subscriptionData[0]) && subscriptionData[0].length > 0) {
                subscription = subscriptionData[0][0];
            } else if (subscriptionData[0]) {
                subscription = subscriptionData[0];
            }
        }

        // Merge subscription data into user object for frontend compatibility
        const userWithSubscription = {
            ...safeUser,
            subscription_type: subscription ? subscription.subscription_type : null,
            subscription_duration: subscription ? subscription.duration : null,
            subscription_status: subscription ? subscription.status : null,
            subscription_start_date: subscription ? subscription.start_date : null,
            subscription_end_date: subscription ? subscription.end_date : null,
            subscription_address: subscription ? subscription.address : null,
            subscription_building_name: subscription ? subscription.building_name : null,
            subscription_flat_number: subscription ? subscription.flat_number : null,
            remaining_days: subscription ? subscription.remaining_days : null
        };

        const response = {
            user: userWithSubscription,
            subscription: subscription,
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

        // Get the most recent active, paused, or expired subscription by username directly
        // Fixed: Calculate remaining days correctly for paused subscriptions
        const query = `
            SELECT
                s.id,
                s.subscription_type,
                s.duration,
                s.created_at,
                s.end_date,
                s.status,
                s.paused_at,
                CASE
                    WHEN s.status = 'active' AND s.end_date IS NOT NULL
                    THEN GREATEST(DATEDIFF(s.end_date, CURDATE()), 0)
                    WHEN s.status = 'paused' AND s.end_date IS NOT NULL AND s.paused_at IS NOT NULL
                    THEN GREATEST(DATEDIFF(s.end_date, s.paused_at), 0)
                    WHEN s.status = 'expired' OR s.end_date < CURDATE()
                    THEN 0
                    ELSE NULL
                END as remaining_days
            FROM subscriptions s
            WHERE s.username = ? AND s.status IN ('active', 'paused', 'expired')
            ORDER BY CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC, CASE WHEN s.status = 'paused' THEN 1 ELSE 0 END DESC, s.created_at DESC
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

        // First get user ID from username
        const userResult = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (!userResult || userResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResult[0].id;

        // Get subscription summary
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_subscriptions,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
                SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END) as total_active_value,
                AVG(CASE WHEN status = 'active' THEN total_amount ELSE NULL END) as avg_subscription_value
            FROM subscriptions
            WHERE user_id = ?
        `;

        const [summary] = await db.query(summaryQuery, [userId]);

        // Get upcoming renewals
        const renewalsQuery = `
            SELECT 
                s.id,
                p.name as product_name,
                s.end_date as renewal_date,
                DATEDIFF(s.end_date, CURDATE()) as days_until_renewal,
                s.total_amount as renewal_amount
            FROM subscriptions s
            JOIN products p ON s.product_id = p.id
            WHERE s.user_id = ? 
                AND s.status = 'active' 
                AND s.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY s.end_date ASC
        `;

        const [upcomingRenewals] = await db.query(renewalsQuery, [userId]);

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
