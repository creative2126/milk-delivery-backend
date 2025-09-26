const express = require('express');
const router = express.Router();
const db = require('../db');
const queryOptimizer = require('../utils/queryOptimizer');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const fetch = require('node-fetch');

console.log('==== apiRoutes-complete-fixed.js router LOADED ====');

// Helper function to normalize database query results
function normalizeQueryResult(result) {
    if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0]; // MySQL with multiple result sets
    }
    return result; // Single result set
}

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
        const query = 'SELECT * FROM users WHERE username = ? OR email = ? OR name = ? LIMIT 1';
        const result = await db.query(query, [usernameOrEmail, usernameOrEmail, usernameOrEmail]);
        const userData = normalizeQueryResult(result);
        
        console.log('Profile query result:', userData);
        
        if (!userData || userData.length === 0) {
            console.log('User not found for:', usernameOrEmail);
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userData[0];
        
        // Create safe user object with subscription data
        const userWithSubscription = {
            // Basic user info
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
            updated_at: user.updated_at || 'NA',
            
            // Subscription data from users table
            subscription_type: user.subscription_type || null,
            subscription_duration: user.subscription_duration || null,
            status: user.subscription_status || null,
            subscription_start_date: user.subscription_start_date || user.subscription_created_at || null,
            subscription_end_date: user.subscription_end_date || null,
            subscription_address: user.subscription_address || null,
            subscription_building_name: user.subscription_building_name || null,
            subscription_flat_number: user.subscription_flat_number || null,
            subscription_amount: user.subscription_amount || null,
            subscription_payment_id: user.subscription_payment_id || null,
            subscription_created_at: user.subscription_created_at || null,
            subscription_updated_at: user.subscription_updated_at || null,
            paused_at: user.paused_at || null,
            resumed_at: user.resumed_at || null,
            total_paused_days: user.total_paused_days || 0,
            
            // Calculate remaining days
            remaining_days: user.subscription_end_date ? 
                Math.max(0, Math.ceil((new Date(user.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))) : 
                null
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
            SET street = ?, city = ?, state = ?, zip = ?, latitude = ?, longitude = ?, updated_at = NOW()
            WHERE username = ?
        `;

        const result = await db.query(updateQuery, [street, city, state, zip, latitude, longitude, username]);
        const updateResult = normalizeQueryResult(result);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            success: true, 
            message: 'Address updated successfully', 
            latitude, 
            longitude 
        });
    } catch (error) {
        console.error('Error updating user address:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

// Get remaining subscription for username - SINGLE ROUTE ONLY
router.get('/subscriptions/remaining/:username', cacheMiddleware.cacheUserData(300), async (req, res) => {
    try {
        const usernameOrEmail = req.params.username;
        console.log('=== FETCHING REMAINING SUBSCRIPTION ===');
        console.log('Username:', usernameOrEmail);

        if (!usernameOrEmail) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Find the user by username OR email OR name
        const userQuery = 'SELECT * FROM users WHERE username = ? OR email = ? OR name = ? LIMIT 1';
        const userResult = await db.query(userQuery, [usernameOrEmail, usernameOrEmail, usernameOrEmail]);
        const userData = normalizeQueryResult(userResult);
        
        console.log('User query result:', userData);

        if (!userData || userData.length === 0) {
            console.log('No user found for:', usernameOrEmail);
            return res.status(404).json({ 
                error: 'User not found',
                hasActiveSubscription: false
            });
        }

        const user = userData[0];
        console.log('Found user:', { 
            id: user.id, 
            username: user.username, 
            name: user.name, 
            subscription_status: user.subscription_status 
        });

        // Check if user has any subscription data - return subscription object even if expired/paused
        const hasAnySubscription = user.subscription_type || user.subscription_status;
        if (!hasAnySubscription) {
            console.log('No subscription found for user:', usernameOrEmail);
            return res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                },
                subscription: null,
                hasActiveSubscription: false,
                cache: true,
                timestamp: new Date().toISOString()
            });
        }

        // Calculate remaining days properly
        let remainingDays = 0;
        if (user.subscription_end_date) {
            const endDate = new Date(user.subscription_end_date);
            const now = new Date();
            remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
        }

        // Create subscription object
        const subscription = {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            phone: user.phone,
            subscription_type: user.subscription_type,
            subscription_duration: user.subscription_duration,
            subscription_amount: user.subscription_amount,
            status: user.subscription_status,
            subscription_start_date: user.subscription_start_date || user.subscription_created_at,
            subscription_end_date: user.subscription_end_date,
            subscription_address: user.subscription_address,
            subscription_building_name: user.subscription_building_name,
            subscription_flat_number: user.subscription_flat_number,
            subscription_payment_id: user.subscription_payment_id,
            subscription_created_at: user.subscription_created_at,
            subscription_updated_at: user.subscription_updated_at,
            paused_at: user.paused_at,
            resumed_at: user.resumed_at,
            total_paused_days: user.total_paused_days || 0,
            remaining_days: remainingDays
        };

        // Determine if subscription is considered "active"
        const hasActiveSubscription = user.subscription_status === 'active' && remainingDays > 0;

        console.log('Subscription found:', {
            status: subscription.subscription_status,
            remaining_days: remainingDays,
            hasActiveSubscription
        });

        const response = {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                phone: user.phone
            },
            subscription: subscription,
            hasActiveSubscription: hasActiveSubscription,
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
router.get('/subscriptions/summary/:username', cacheMiddleware.cacheUserData(300), async (req, res) => {
    try {
        const username = req.params.username;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Get user data with subscription info from users table
        const userResult = await db.query(
            'SELECT id, username, subscription_status, subscription_amount, subscription_created_at FROM users WHERE username = ? OR email = ? LIMIT 1',
            [username, username]
        );
        const userData = normalizeQueryResult(userResult);

        if (!userData || userData.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userData[0];

        // Create summary data based on single user record
        const summary = {
            total_subscriptions: user.subscription_status ? 1 : 0,
            active_subscriptions: user.subscription_status === 'active' ? 1 : 0,
            paused_subscriptions: user.subscription_status === 'paused' ? 1 : 0,
            cancelled_subscriptions: user.subscription_status === 'cancelled' ? 1 : 0,
            expired_subscriptions: user.subscription_status === 'expired' ? 1 : 0,
            total_active_value: user.subscription_status === 'active' ? (user.subscription_amount || 0) : 0,
            avg_subscription_value: user.subscription_amount || 0
        };

        // Get upcoming renewals if subscription is active
        const upcomingRenewals = [];
        if (user.subscription_status === 'active' && user.subscription_end_date) {
            const endDate = new Date(user.subscription_end_date);
            const now = new Date();
            const daysUntilRenewal = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
                upcomingRenewals.push({
                    subscriptionId: user.id,
                    productName: user.subscription_type,
                    renewalDate: user.subscription_end_date,
                    daysUntilRenewal: daysUntilRenewal,
                    renewalAmount: user.subscription_amount
                });
            }
        }

        const response = {
            username,
            summary: summary,
            upcomingRenewals: upcomingRenewals,
            cache: true,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error('Subscriptions summary error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription summary' });
    }
});

// Helper function to validate subscription state for pause
async function validateSubscriptionForPause(username) {
    const result = await db.query(
        'SELECT subscription_status, subscription_end_date FROM users WHERE username = ? LIMIT 1',
        [username]
    );
    const userData = normalizeQueryResult(result);

    if (!userData || userData.length === 0) {
        return { valid: false, error: 'Subscription not found' };
    }

    const currentSub = userData[0];

    if (currentSub.subscription_status !== 'active') {
        return { 
            valid: false, 
            error: `Cannot pause subscription. Current status: ${currentSub.subscription_status}. Only active subscriptions can be paused.` 
        };
    }

    // Check if subscription has expired
    if (currentSub.subscription_end_date) {
        const endDate = new Date(currentSub.subscription_end_date);
        const now = new Date();
        if (endDate <= now) {
            return { valid: false, error: 'Cannot pause expired subscription' };
        }
    }

    return { valid: true, subscription: currentSub };
}

// Helper function to validate subscription for resume
async function validateSubscriptionForResume(username) {
    const result = await db.query(
        'SELECT subscription_status, paused_at, subscription_end_date FROM users WHERE username = ? LIMIT 1',
        [username]
    );
    const userData = normalizeQueryResult(result);

    if (!userData || userData.length === 0) {
        return { valid: false, error: 'Subscription not found' };
    }

    const currentSub = userData[0];

    if (currentSub.subscription_status !== 'paused') {
        return { 
            valid: false, 
            error: `Cannot resume subscription. Current status: ${currentSub.subscription_status}. Only paused subscriptions can be resumed.` 
        };
    }

    if (!currentSub.paused_at) {
        return { 
            valid: false, 
            error: 'Subscription is marked as paused but has no pause timestamp. Please contact support.' 
        };
    }

    // Check if subscription has expired
    if (currentSub.subscription_end_date) {
        const endDate = new Date(currentSub.subscription_end_date);
        const now = new Date();
        if (endDate <= now) {
            return { valid: false, error: 'Cannot resume expired subscription' };
        }
    }

    return { valid: true, subscription: currentSub };
}

// Pause subscription endpoint
router.put('/subscriptions/:id/pause', async (req, res) => {
    try {
        const subscriptionId = req.params.id;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }

        console.log(`Attempting to pause subscription for user: ${username}`);

        // Validate subscription state
        const validation = await validateSubscriptionForPause(username);
        if (!validation.valid) {
            console.log(`Pause validation failed: ${validation.error}`);
            return res.status(400).json({ success: false, message: validation.error });
        }

        // Update subscription status to paused and set paused_at timestamp
        const updateResult = await db.query(
            'UPDATE users SET subscription_status = ?, paused_at = NOW(), subscription_updated_at = NOW() WHERE username = ? AND subscription_status = ?',
            ['paused', username, 'active']
        );
        const result = normalizeQueryResult(updateResult);

        if (result.affectedRows === 0) {
            console.log(`Failed to pause subscription for user: ${username}`);
            return res.status(400).json({ success: false, message: 'Failed to pause subscription' });
        }

        console.log(`Successfully paused subscription for user: ${username}`);
        res.json({ success: true, message: 'Subscription paused successfully' });
    } catch (error) {
        console.error('Error pausing subscription:', error);
        res.status(500).json({ success: false, message: 'Failed to pause subscription' });
    }
});

// Resume subscription endpoint
router.put('/subscriptions/:id/resume', async (req, res) => {
    try {
        const subscriptionId = req.params.id;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }

        console.log(`Attempting to resume subscription for user: ${username}`);

        // Validate subscription state
        const validation = await validateSubscriptionForResume(username);
        if (!validation.valid) {
            console.log(`Resume validation failed: ${validation.error}`);
            return res.status(400).json({ success: false, message: validation.error });
        }

        const { subscription } = validation;

        // Calculate paused days
        let pausedDays = 0;
        if (subscription.paused_at) {
            const pausedAt = new Date(subscription.paused_at);
            const now = new Date();
            pausedDays = Math.ceil((now - pausedAt) / (1000 * 60 * 60 * 24));
        }

        console.log(`Subscription was paused for ${pausedDays} days`);

        // Update subscription status to active and set resumed_at timestamp
        const updateResult = await db.query(
            'UPDATE users SET subscription_status = ?, resumed_at = NOW(), total_paused_days = COALESCE(total_paused_days, 0) + ?, subscription_updated_at = NOW() WHERE username = ? AND subscription_status = ?',
            ['active', pausedDays, username, 'paused']
        );
        const result = normalizeQueryResult(updateResult);

        if (result.affectedRows === 0) {
            console.log(`Failed to resume subscription for user: ${username}`);
            return res.status(400).json({ success: false, message: 'Failed to resume subscription' });
        }

        console.log(`Successfully resumed subscription for user: ${username}`);
        res.json({ 
            success: true, 
            message: 'Subscription resumed successfully',
            pausedDays: pausedDays
        });
    } catch (error) {
        console.error('Error resuming subscription:', error);
        res.status(500).json({ success: false, message: 'Failed to resume subscription' });
    }
});

module.exports = router;
