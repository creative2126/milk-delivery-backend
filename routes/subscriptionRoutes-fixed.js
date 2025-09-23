const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');
const { verifyPayment } = require('../razorpay-utils');
const { authenticateToken } = require('../middleware/auth');

// Get all subscriptions (from users table)
router.get('/subscriptions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at
            FROM users
            WHERE subscription_status IS NOT NULL
            ORDER BY subscription_created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Get subscription by ID (from users table)
router.get('/subscriptions/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at
            FROM users
            WHERE id = ? AND subscription_status IS NOT NULL
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Get subscriptions by username (from users table)
router.get('/users/:username/subscriptions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at
            FROM users
            WHERE username = ? AND subscription_status IS NOT NULL
            ORDER BY subscription_created_at DESC
        `, [req.params.username]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching user subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch user subscriptions' });
    }
});

// Get remaining subscription for username (most recent active/inactive/expired)
router.get('/remaining/:username', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at,
                   DATEDIFF(subscription_end_date, NOW()) as remaining_days
            FROM users
            WHERE username = ? AND subscription_status IN ('active', 'inactive', 'paused', 'expired')
            ORDER BY subscription_created_at DESC
            LIMIT 1
        `, [req.params.username]);

        if (!rows || rows.length === 0) {
            return res.json({ subscription: null, hasActiveSubscription: false });
        }

        const subscription = rows[0];
        const hasActiveSubscription = subscription.subscription_status === 'active' && subscription.remaining_days >= 0;

        res.json({
            subscription: subscription,
            hasActiveSubscription: hasActiveSubscription
        });
    } catch (error) {
        console.error('Error fetching remaining subscription:', error);
        res.status(500).json({ error: 'Failed to fetch remaining subscription' });
    }
});

// Create new subscription (handles both / and /subscriptions)
router.post('/', [
    body('username').isLength({ min: 1 }).withMessage('Username is required'),
    body('subscription_type').isLength({ min: 1 }).withMessage('Subscription type is required'),
    body('duration').isLength({ min: 1 }).withMessage('Duration is required'),
    body('amount').isDecimal().withMessage('Amount must be a decimal'),
    body('address').isLength({ min: 1 }).withMessage('Address is required'),
    body('building_name').isLength({ min: 1 }).withMessage('Building name is required'),
    body('flat_number').isLength({ min: 1 }).withMessage('Flat number is required'),
    body('payment_id').isLength({ min: 1 }).withMessage('Payment ID is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array(), message: 'Validation failed on subscription data', code: 1000 });
    }

    const {
        username,
        subscription_type,
        duration,
        amount,
        address,
        building_name,
        flat_number,
        payment_id
    } = req.body;

    console.log('Creating subscription with data:', {
        username, subscription_type, duration, amount, address, building_name, flat_number, payment_id
    });

    // Find user by username or user ID
    let userId;
    try {
        console.log('Looking up user with identifier:', username);

        // Try to find user by username, email, or name
        let userQuery = 'SELECT id, username FROM users WHERE username = ? OR email = ? OR name = ?';
        let userResult = await db.query(userQuery, [username, username, username]);

        // Handle different database response formats
        let userRows;
        if (Array.isArray(userResult) && Array.isArray(userResult[0])) {
            userRows = userResult[0];
        } else if (Array.isArray(userResult)) {
            userRows = userResult;
        } else {
            console.error('Unexpected userResult format:', typeof userResult, userResult);
            throw new Error('Database query returned unexpected format');
        }

        console.log('User lookup result:', userRows);

        if (!userRows || userRows.length === 0) {
            // If not found by username, try by ID (in case username is actually an ID)
            if (!isNaN(username)) {
                console.log('Username looks like ID, trying lookup by ID:', username);
                userQuery = 'SELECT id, username FROM users WHERE id = ?';
                userResult = await db.query(userQuery, [parseInt(username)]);

                if (Array.isArray(userResult) && Array.isArray(userResult[0])) {
                    userRows = userResult[0];
                } else if (Array.isArray(userResult)) {
                    userRows = userResult;
                } else {
                    userRows = [];
                }
            }
        }

        if (!userRows || userRows.length === 0) {
            console.error('User not found for identifier:', username);
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with username/email/ID: ${username}`,
                code: 1001
            });
        }

        userId = userRows[0].id;
        console.log('Found user ID:', userId, 'for identifier:', username);
    } catch (userError) {
        console.error('Error finding user:', userError);
        return res.status(500).json({
            error: 'Failed to find user',
            message: userError.message || 'Database error during user lookup',
            code: 1004
        });
    }

    // Update expired active subscriptions to 'expired' status
    try {
        await db.query(`
            UPDATE users SET subscription_status = 'expired'
            WHERE subscription_status = 'active' AND subscription_end_date < NOW()
        `);
        console.log('Updated expired subscriptions for user:', username);
    } catch (updateError) {
        console.error('Error updating expired subscriptions:', updateError);
        // Continue anyway, as this is not critical for subscription creation
    }

    // Check if user already has an active subscription
    try {
        const activeSubsResult = await db.query(
            'SELECT id FROM users WHERE id = ? AND subscription_status = "active"',
            [userId]
        );

        // Handle different database response formats
        let activeSubs;
        if (Array.isArray(activeSubsResult) && Array.isArray(activeSubsResult[0])) {
            activeSubs = activeSubsResult[0];
        } else if (Array.isArray(activeSubsResult)) {
            activeSubs = activeSubsResult;
        } else {
            console.error('Unexpected activeSubsResult format:', typeof activeSubsResult, activeSubsResult);
            throw new Error('Database query returned unexpected format for active subscriptions');
        }

        if (activeSubs && activeSubs.length > 0) {
            return res.status(400).json({
                error: 'Active subscription exists',
                message: 'User already has an active subscription. Cannot create new subscription until current one expires.',
                code: 1007
            });
        }
    } catch (checkError) {
        console.error('Error checking active subscriptions:', checkError);
        return res.status(500).json({
            error: 'Failed to check active subscriptions',
            message: checkError.message,
            code: 1008
        });
    }

    // Verify Razorpay payment before creating subscription
    try {
        const expectedAmountInPaise = parseFloat(amount) * 100;
        await verifyPayment(payment_id, expectedAmountInPaise);
        console.log('Payment verification successful for payment_id:', payment_id);
    } catch (paymentError) {
        console.error('Payment verification failed:', paymentError.message);
        return res.status(400).json({
            error: 'Payment verification failed',
            details: paymentError.message,
            message: 'Payment verification failed for payment_id: ' + payment_id,
            code: 1003
        });
    }

    try {
        // Calculate subscription dates
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        if (duration === 'daily') {
            endDate.setDate(endDate.getDate() + 1);
        } else if (duration === 'weekly') {
            endDate.setDate(endDate.getDate() + 7);
        } else if (duration === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        const endDateStr = endDate.toISOString().split('T')[0];

        // Update users table with subscription details
        const updateResult = await db.query(`
            UPDATE users SET
                subscription_type = ?,
                subscription_duration = ?,
                subscription_amount = ?,
                subscription_address = ?,
                subscription_building_name = ?,
                subscription_flat_number = ?,
                subscription_payment_id = ?,
                subscription_status = ?,
                subscription_start_date = ?,
                subscription_end_date = ?,
                subscription_created_at = NOW(),
                subscription_updated_at = NOW()
            WHERE id = ?
        `, [
            subscription_type,
            duration,
            amount,
            address,
            building_name,
            flat_number,
            payment_id,
            'active',
            startDate,
            endDateStr,
            userId
        ]);

        console.log('Subscription created for user ID:', userId);

        // Get the updated user data
        const [userData] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at
            FROM users WHERE id = ?
        `, [userId]);

        res.status(201).json({
            id: userId,
            ...userData[0]
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription', details: error.message, message: 'Database insertion error', code: 1006 });
    }
});

// Additional route to handle /subscriptions (without trailing slash) - fixes 404 error
router.post('/subscriptions/', [
    body('username').isLength({ min: 1 }).withMessage('Username is required'),
    body('subscription_type').isLength({ min: 1 }).withMessage('Subscription type is required'),
    body('duration').isLength({ min: 1 }).withMessage('Duration is required'),
    body('amount').isDecimal().withMessage('Amount must be a decimal'),
    body('address').isLength({ min: 1 }).withMessage('Address is required'),
    body('building_name').isLength({ min: 1 }).withMessage('Building name is required'),
    body('flat_number').isLength({ min: 1 }).withMessage('Flat number is required'),
    body('payment_id').isLength({ min: 1 }).withMessage('Payment ID is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array(), message: 'Validation failed on subscription data', code: 1000 });
    }

    const {
        username,
        subscription_type,
        duration,
        amount,
        address,
        building_name,
        flat_number,
        payment_id
    } = req.body;

    console.log('Creating subscription with data:', {
        username, subscription_type, duration, amount, address, building_name, flat_number, payment_id
    });

    // Find user by username or user ID
    let userId;
    try {
        console.log('Looking up user with identifier:', username);

        // Try to find user by username, email, or name
        let userQuery = 'SELECT id, username FROM users WHERE username = ? OR email = ? OR name = ?';
        let userResult = await db.query(userQuery, [username, username, username]);

        // Handle different database response formats
        let userRows;
        if (Array.isArray(userResult) && Array.isArray(userResult[0])) {
            userRows = userResult[0];
        } else if (Array.isArray(userResult)) {
            userRows = userResult;
        } else {
            console.error('Unexpected userResult format:', typeof userResult, userResult);
            throw new Error('Database query returned unexpected format');
        }

        console.log('User lookup result:', userRows);

        if (!userRows || userRows.length === 0) {
            // If not found by username, try by ID (in case username is actually an ID)
            if (!isNaN(username)) {
                console.log('Username looks like ID, trying lookup by ID:', username);
                userQuery = 'SELECT id, username FROM users WHERE id = ?';
                userResult = await db.query(userQuery, [parseInt(username)]);

                if (Array.isArray(userResult) && Array.isArray(userResult[0])) {
                    userRows = userResult[0];
                } else if (Array.isArray(userResult)) {
                    userRows = userResult;
                } else {
                    userRows = [];
                }
            }
        }

        if (!userRows || userRows.length === 0) {
            console.error('User not found for identifier:', username);
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with username/email/ID: ${username}`,
                code: 1001
            });
        }

        userId = userRows[0].id;
        console.log('Found user ID:', userId, 'for identifier:', username);
    } catch (userError) {
        console.error('Error finding user:', userError);
        return res.status(500).json({
            error: 'Failed to find user',
            message: userError.message || 'Database error during user lookup',
            code: 1004
        });
    }

    // Update expired active subscriptions to 'expired' status
    try {
        await db.query(`
            UPDATE users SET subscription_status = 'expired'
            WHERE subscription_status = 'active' AND subscription_end_date < NOW()
        `);
        console.log('Updated expired subscriptions for user:', username);
    } catch (updateError) {
        console.error('Error updating expired subscriptions:', updateError);
        // Continue anyway, as this is not critical for subscription creation
    }

    // Check if user already has an active subscription
    try {
        const activeSubsResult = await db.query(
            'SELECT id FROM users WHERE id = ? AND subscription_status = "active"',
            [userId]
        );

        // Handle different database response formats
        let activeSubs;
        if (Array.isArray(activeSubsResult) && Array.isArray(activeSubsResult[0])) {
            activeSubs = activeSubsResult[0];
        } else if (Array.isArray(activeSubsResult)) {
            activeSubs = activeSubsResult;
        } else {
            console.error('Unexpected activeSubsResult format:', typeof activeSubsResult, activeSubsResult);
            throw new Error('Database query returned unexpected format for active subscriptions');
        }

        if (activeSubs && activeSubs.length > 0) {
            return res.status(400).json({
                error: 'Active subscription exists',
                message: 'User already has an active subscription. Cannot create new subscription until current one expires.',
                code: 1007
            });
        }
    } catch (checkError) {
        console.error('Error checking active subscriptions:', checkError);
        return res.status(500).json({
            error: 'Failed to check active subscriptions',
            message: checkError.message,
            code: 1008
        });
    }

    // Verify Razorpay payment before creating subscription
    try {
        const expectedAmountInPaise = parseFloat(amount) * 100;
        await verifyPayment(payment_id, expectedAmountInPaise);
        console.log('Payment verification successful for payment_id:', payment_id);
    } catch (paymentError) {
        console.error('Payment verification failed:', paymentError.message);
        return res.status(400).json({
            error: 'Payment verification failed',
            details: paymentError.message,
            message: 'Payment verification failed for payment_id: ' + payment_id,
            code: 1003
        });
    }

    try {
        // Calculate subscription dates
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        if (duration === 'daily') {
            endDate.setDate(endDate.getDate() + 1);
        } else if (duration === 'weekly') {
            endDate.setDate(endDate.getDate() + 7);
        } else if (duration === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        const endDateStr = endDate.toISOString().split('T')[0];

        // Update users table with subscription details
        const updateResult = await db.query(`
            UPDATE users SET
                subscription_type = ?,
                subscription_duration = ?,
                subscription_amount = ?,
                subscription_address = ?,
                subscription_building_name = ?,
                subscription_flat_number = ?,
                subscription_payment_id = ?,
                subscription_status = ?,
                subscription_start_date = ?,
                subscription_end_date = ?,
                subscription_created_at = NOW(),
                subscription_updated_at = NOW()
            WHERE id = ?
        `, [
            subscription_type,
            duration,
            amount,
            address,
            building_name,
            flat_number,
            payment_id,
            'active',
            startDate,
            endDateStr,
            userId
        ]);

        console.log('Subscription created for user ID:', userId);

        // Get the updated user data
        const [userData] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at
            FROM users WHERE id = ?
        `, [userId]);

        res.status(201).json({
            id: userId,
            ...userData[0]
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription', details: error.message, message: 'Database insertion error', code: 1006 });
    }
});

// Update subscription
router.put('/subscriptions/:id', [
    body('subscription_type').optional().isLength({ min: 1 }).withMessage('Subscription type is required'),
    body('subscription_duration').optional().isLength({ min: 1 }).withMessage('Duration is required'),
    body('subscription_amount').optional().isDecimal().withMessage('Amount must be a decimal'),
    body('subscription_status').optional().isIn(['active', 'paused', 'cancelled', 'expired']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const updates = req.body;

    try {
        // Build update query
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(userId);

        await db.query(`
            UPDATE users
            SET ${fields.join(', ')}, subscription_updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, values);

        const [updatedUser] = await db.query(`
            SELECT id, username, subscription_type, subscription_duration, subscription_amount,
                   subscription_status, subscription_start_date, subscription_end_date,
                   subscription_created_at, subscription_updated_at
            FROM users WHERE id = ?
        `, [userId]);

        res.json(updatedUser[0]);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

// Delete subscription
router.delete('/subscriptions/:id', async (req, res) => {
    try {
        const [result] = await db.query(`
            UPDATE users SET
                subscription_status = 'cancelled',
                subscription_updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Pause subscription
router.put('/:id/pause', async (req, res) => {
    try {
        const userId = req.params.id;

        // Get current subscription
        const [currentUser] = await db.query(`
            SELECT subscription_status FROM users WHERE id = ?
        `, [userId]);

        if (!currentUser || currentUser.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const subscription = currentUser[0];

        // Check if subscription can be paused
        if (subscription.subscription_status !== 'active') {
            return res.status(400).json({
                success: false,
                error: `Subscription is already ${subscription.subscription_status}`
            });
        }

        // Update subscription status to paused
        await db.query(`
            UPDATE users SET
                subscription_status = ?,
                paused_at = CURRENT_TIMESTAMP,
                subscription_updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, ['paused', userId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error pausing subscription:', error);
        res.status(500).json({ success: false, error: 'Failed to pause subscription' });
    }
});

// Resume subscription
router.put('/:id/resume', async (req, res) => {
    try {
        const userId = req.params.id;
        const { username } = req.body || {};

        console.log(`Resume subscription request: ID=${userId}, Username=${username}`);

        // Get current subscription
        const [currentUser] = await db.query(`
            SELECT id, username, subscription_status, subscription_end_date FROM users WHERE id = ?
        `, [userId]);

        if (!currentUser || currentUser.length === 0) {
            console.log(`User ${userId} not found`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const subscription = currentUser[0];
        console.log(`Found user ${userId}:`, {
            username: subscription.username,
            subscription_status: subscription.subscription_status
        });

        // Check if subscription can be resumed
        if (subscription.subscription_status !== 'paused') {
            console.log(`Subscription ${userId} is not paused. Current status: ${subscription.subscription_status}`);
            return res.status(400).json({
                success: false,
                message: `Subscription is not paused (current status: ${subscription.subscription_status})`
            });
        }

        // Check if subscription has expired (handle null end dates)
        const now = new Date();
        let endDate = null;

        if (subscription.subscription_end_date) {
            endDate = new Date(subscription.subscription_end_date);
            if (endDate < now) {
                console.log(`Subscription ${userId} has expired`);
                return res.status(400).json({
                    success: false,
                    message: 'Your subscription has expired. Please create a new subscription.'
                });
            }
        } else {
            console.log(`Subscription ${userId} has null end date - allowing resume`);
        }

        // Update subscription status to active
        const [updateResult] = await db.query(`
            UPDATE users SET
                subscription_status = ?,
                resumed_at = CURRENT_TIMESTAMP,
                subscription_updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, ['active', userId]);

        console.log(`Updated ${updateResult.affectedRows} subscription(s) to active status`);

        if (updateResult.affectedRows === 0) {
            console.log(`Failed to update subscription ${userId}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to update subscription status'
            });
        }

        res.json({
            success: true,
            message: 'Subscription resumed successfully',
            subscription: {
                id: subscription.id,
                username: subscription.username,
                subscription_status: 'active'
            }
        });
    } catch (error) {
        console.error('Error resuming subscription:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
