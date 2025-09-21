const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');
const { verifyPayment } = require('../razorpay-utils');
const { authenticateToken } = require('../middleware/auth');
const subscriptionCache = require('../middleware/subscriptionCache');

// Get all subscriptions
router.get('/subscriptions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM subscriptions
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Get subscription by ID
router.get('/subscriptions/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, dz.zone_name, dz.postal_codes, dz.delivery_days, dz.delivery_time_slots
            FROM subscriptions s
            JOIN delivery_zones dz ON s.delivery_zone_id = dz.id
            WHERE s.id = ?
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

// Get subscriptions by username
router.get('/users/:username/subscriptions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM subscriptions
            WHERE username = ?
            ORDER BY created_at DESC
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
        const queryResult = await db.query(`
            SELECT *,
                   DATEDIFF(end_date, NOW()) as remaining_days
            FROM subscriptions
            WHERE username = ? AND status IN ('active', 'inactive', 'paused', 'expired')
            ORDER BY created_at DESC
            LIMIT 1
        `, [req.params.username]);

        // Handle different database response formats
        let rows;
        if (Array.isArray(queryResult) && Array.isArray(queryResult[0])) {
            rows = queryResult[0];
        } else if (Array.isArray(queryResult)) {
            rows = queryResult;
        } else {
            console.error('Unexpected queryResult format:', typeof queryResult, queryResult);
            return res.status(500).json({ error: 'Database query returned unexpected format' });
        }

        if (!rows || rows.length === 0) {
            return res.json({ subscription: null, hasActiveSubscription: false });
        }

        const subscription = rows[0];
        const hasActiveSubscription = subscription.status === 'active' && subscription.remaining_days >= 0;

        res.json({
            subscription: subscription,
            hasActiveSubscription: hasActiveSubscription
        });
    } catch (error) {
        console.error('Error fetching remaining subscription:', error);
        res.status(500).json({ error: 'Failed to fetch remaining subscription' });
    }
});

// Create new subscription
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
            UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND end_date < NOW()
        `);
        console.log('Updated expired subscriptions for user:', username);
    } catch (updateError) {
        console.error('Error updating expired subscriptions:', updateError);
        // Continue anyway, as this is not critical for subscription creation
    }

    // Check if user already has an active subscription
    try {
        const activeSubsResult = await db.query(
            'SELECT id FROM subscriptions WHERE user_id = ? AND status = "active"',
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
        const insertResult = await db.query(`
            INSERT INTO subscriptions (
                user_id, product_id, username, subscription_type, duration, amount, total_amount, address,
                building_name, flat_number, payment_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
            userId, 1, username, subscription_type, duration, amount, amount, address,
            building_name, flat_number, payment_id
        ]);

        let insertId;
        if (Array.isArray(insertResult) && Array.isArray(insertResult[0])) {
            insertId = insertResult[0].insertId;
        } else if (Array.isArray(insertResult) && insertResult.insertId) {
            insertId = insertResult.insertId;
        } else if (!Array.isArray(insertResult) && insertResult.insertId) {
            insertId = insertResult.insertId;
        } else {
            console.error('Unexpected insertResult format:', typeof insertResult, insertResult);
            throw new Error('Unexpected database response format for insert');
        }

        console.log('Subscription created with ID:', insertId);

        // Get the actual start_date and end_date from the newly created subscription
        const [subscriptionData] = await db.query(`
            SELECT start_date, end_date FROM subscriptions WHERE id = ?
        `, [insertId]);

        let startDate = null;
        let endDate = null;

        if (subscriptionData && subscriptionData.length > 0) {
            startDate = subscriptionData[0].start_date;
            endDate = subscriptionData[0].end_date;
        }

        // If no dates from subscription, use current date logic
        if (!startDate) {
            startDate = new Date().toISOString().split('T')[0];
        }
        if (!endDate) {
            const endDateObj = new Date();
            endDateObj.setDate(endDateObj.getDate() + 6);
            endDate = endDateObj.toISOString().split('T')[0];
        }

        // Update users table subscription columns with new subscription details
        await db.query(`
            UPDATE users SET
                subscription_type = ?,
                subscription_duration = ?,
                subscription_status = ?,
                subscription_start_date = ?,
                subscription_end_date = ?
            WHERE id = ?
        `, [
            subscription_type,
            duration,
            'active',
            startDate,
            endDate,
            userId
        ]);

        // Invalidate user subscription cache to ensure fresh data
        await subscriptionCache.invalidateUserSubscriptions(userId);

        const selectResult = await db.query(`
            SELECT * FROM subscriptions WHERE id = ?
        `, [insertId]);

        let subscription;
        if (Array.isArray(selectResult) && Array.isArray(selectResult[0])) {
            subscription = selectResult[0];
        } else if (Array.isArray(selectResult)) {
            subscription = selectResult;
        } else {
            throw new Error('Unexpected database response format for select');
        }

        res.status(201).json({
            id: insertId,
            ...subscription[0]
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription', details: error.message, message: 'Database insertion error', code: 1006 });
    }
});

// Update subscription
router.put('/subscriptions/:id', [
    body('milkType').optional().isLength({ min: 1 }).withMessage('Milk type is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
    body('deliveryAddress').optional().isLength({ min: 1 }).withMessage('Delivery address is required'),
    body('deliveryZoneId').optional().isInt().withMessage('Delivery zone ID must be an integer'),
    body('preferredDeliveryTime').optional().isLength({ min: 1 }).withMessage('Preferred delivery time is required'),
    body('status').optional().isIn(['active', 'paused', 'cancelled', 'expired']).withMessage('Invalid status'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed']).withMessage('Invalid payment status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const subscriptionId = req.params.id;
    const updates = req.body;

    try {
        // Get current subscription for history
        const [currentSubscription] = await db.query('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId]);
        if (currentSubscription.length === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

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

        values.push(subscriptionId);

        await db.query(`
            UPDATE subscriptions 
            SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `, values);

        // Log the change in history (if subscription_history table exists)
        try {
            await db.query(`
                INSERT INTO subscription_history (subscriptionId, action, oldValue, newValue, changedBy)
                VALUES (?, 'update', ?, ?, ?)
            `, [
                subscriptionId,
                JSON.stringify(currentSubscription[0]),
                JSON.stringify(updates),
                req.user?.id || null
            ]);
        } catch (historyError) {
            console.log('History table not available:', historyError.message);
        }

        const [updatedSubscription] = await db.query(`
            SELECT s.*, dz.zone_name, dz.postal_codes, dz.delivery_days, dz.delivery_time_slots
            FROM subscriptions s
            JOIN delivery_zones dz ON s.delivery_zone_id = dz.id
            WHERE s.id = ?
        `, [subscriptionId]);

        res.json(updatedSubscription[0]);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

// Delete subscription
router.delete('/subscriptions/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json({ message: 'Subscription deleted successfully' });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ error: 'Failed to delete subscription' });
    }
});

// Get delivery zones
router.get('/delivery-zones', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM delivery_zones WHERE isActive = TRUE ORDER BY zoneName');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching delivery zones:', error);
        res.status(500).json({ error: 'Failed to fetch delivery zones' });
    }
});

// Get subscriptions by status
router.get('/subscriptions/status/:status', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, dz.zone_name, dz.postal_codes, dz.delivery_days, dz.delivery_time_slots
            FROM subscriptions s
            JOIN delivery_zones dz ON s.delivery_zone_id = dz.id
            WHERE s.status = ?
            ORDER BY s.next_delivery_date ASC
        `, [req.params.status]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching subscriptions by status:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Get remaining subscription for user
router.get('/subscriptions/remaining/:username', async (req, res) => {
    try {
        const username = req.params.username;

        // Get the most recent subscription for the user (prioritize active, then inactive, then expired)
        const [rows] = await db.query(`
            SELECT s.*,
                   DATEDIFF(s.end_date, NOW()) as remaining_days
            FROM subscriptions s
            WHERE s.username = ?
            AND s.status IN ('active', 'inactive', 'expired')
            ORDER BY
                CASE WHEN s.status = 'active' THEN 1
                     WHEN s.status = 'inactive' THEN 2
                     ELSE 3 END,
                s.created_at DESC
            LIMIT 1
        `, [username]);

        if (rows.length === 0) {
            return res.json({
                hasActiveSubscription: false,
                subscription: null
            });
        }

        const subscription = rows[0];
        // Only consider subscription as active if status is 'active' AND it hasn't expired
        const hasActiveSubscription = subscription.status === 'active' && subscription.remaining_days >= 0;

        res.json({
            hasActiveSubscription,
            subscription
        });
    } catch (error) {
        console.error('Error fetching subscription remaining for username:', req.params.username, error);
        res.status(500).json({ error: 'Failed to fetch subscription remaining', details: error.message });
    }
});

// Pause subscription
router.put('/:id/pause', async (req, res) => {
    try {
        const subscriptionId = req.params.id;
        console.log('Starting pause operation for subscription ID:', subscriptionId);

        // Get current subscription
        console.log('Querying subscription from database...');
        const currentSubscription = await db.query('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId]);
        console.log('Database query result type:', typeof currentSubscription);
        console.log('Database query result:', currentSubscription);
        console.log('Is array?', Array.isArray(currentSubscription));

        if (!currentSubscription || (Array.isArray(currentSubscription) && currentSubscription.length === 0)) {
            console.log('Subscription not found');
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        // Handle different database response formats
        let subscription;
        console.log('Checking conditions:');
        console.log('Array.isArray(currentSubscription):', Array.isArray(currentSubscription));
        console.log('currentSubscription:', currentSubscription);
        console.log('typeof currentSubscription:', typeof currentSubscription);
        console.log('currentSubscription && typeof currentSubscription === "object":', currentSubscription && typeof currentSubscription === 'object');

        if (Array.isArray(currentSubscription) && currentSubscription.length > 0) {
            subscription = currentSubscription[0];
            console.log('Assigned from array[0]:', subscription);
        } else if (currentSubscription && typeof currentSubscription === 'object') {
            subscription = currentSubscription;
            console.log('Assigned directly from object:', subscription);
        } else {
            console.log('Unexpected subscription data format - currentSubscription:', currentSubscription);
            console.log('currentSubscription is null/undefined:', currentSubscription == null);
            console.log('typeof currentSubscription:', typeof currentSubscription);
            return res.status(500).json({ success: false, error: 'Unexpected database response format' });
        }

        console.log('Final subscription assignment:', subscription);

        // Check if subscription can be paused
        if (subscription.status !== 'active') {
            console.log('Subscription status is not active:', subscription.status);
            return res.status(400).json({
                success: false,
                error: `Subscription is already ${subscription.status}`
            });
        }

        // Additional debug: log subscription remaining_days if available
        if (subscription.remaining_days !== undefined) {
            console.log('Subscription remaining_days:', subscription.remaining_days);
        } else {
            console.log('Subscription remaining_days not available');
        }

        // Update subscription status to paused
        console.log('Updating subscription status to paused...');
        const updateResult = await db.query(
            'UPDATE subscriptions SET status = ?, paused_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['paused', subscriptionId]
        );
        console.log('Subscription update result:', updateResult);

        // Find the correct user to update - try user_id first, then fallback to username lookup
        let userIdToUpdate = subscription.user_id;
        console.log('Original user_id from subscription:', userIdToUpdate);

        // Verify the user exists with the user_id
        console.log('Checking if user exists with user_id:', subscription.user_id);
        const [userCheck] = await db.query('SELECT id FROM users WHERE id = ?', [subscription.user_id]);
        console.log('User check result:', userCheck);

        if (!userCheck || userCheck.length === 0) {
            console.log('User not found with user_id, trying fallback lookup...');
            // Fallback: find user by username/email
            const [userByName] = await db.query(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [subscription.username, subscription.username]
            );
            console.log('Fallback user lookup result:', userByName);

            if (userByName && userByName.length > 0) {
                userIdToUpdate = userByName[0].id;
                console.log(`Updated user_id from ${subscription.user_id} to ${userIdToUpdate} for subscription ${subscriptionId}`);
            } else {
                console.warn(`Could not find user for subscription ${subscriptionId} with username ${subscription.username}`);
                // Continue without updating user table
                userIdToUpdate = null;
            }
        }

        // Update users table subscription status if we found a valid user
        if (userIdToUpdate) {
            console.log('Updating users table with user_id:', userIdToUpdate);
            const userUpdateResult = await db.query(
                'UPDATE users SET subscription_status = ? WHERE id = ?',
                ['paused', userIdToUpdate]
            );
            console.log('User update result:', userUpdateResult);
        } else {
            console.log('Skipping user table update due to no valid user_id');
        }

        // Invalidate user subscription cache (optional - will fail gracefully if Redis is down)
        try {
            console.log('Invalidating cache for user_id:', userIdToUpdate || subscription.user_id);
            await subscriptionCache.invalidateUserSubscriptions(userIdToUpdate || subscription.user_id);
        } catch (cacheError) {
            console.log('Cache invalidation failed, but continuing:', cacheError.message);
        }

        console.log('Pause operation completed successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error pausing subscription:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, error: 'Failed to pause subscription' });
    }
});

// Resume subscription
router.put('/:id/resume', async (req, res) => {
    try {
        const subscriptionId = req.params.id;
        console.log('Starting resume operation for subscription ID:', subscriptionId);

        // Get current subscription
        console.log('Querying subscription from database...');
        const currentSubscription = await db.query('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId]);
        console.log('Database query result type:', typeof currentSubscription);
        console.log('Database query result:', currentSubscription);
        console.log('Is array?', Array.isArray(currentSubscription));

        if (!currentSubscription || (Array.isArray(currentSubscription) && currentSubscription.length === 0)) {
            console.log('Subscription not found');
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        // Handle different database response formats
        let subscription;
        console.log('Checking conditions:');
        console.log('Array.isArray(currentSubscription):', Array.isArray(currentSubscription));
        console.log('currentSubscription:', currentSubscription);
        console.log('typeof currentSubscription:', typeof currentSubscription);
        console.log('currentSubscription && typeof currentSubscription === "object":', currentSubscription && typeof currentSubscription === 'object');

        if (Array.isArray(currentSubscription) && currentSubscription.length > 0) {
            subscription = currentSubscription[0];
            console.log('Assigned from array[0]:', subscription);
        } else if (currentSubscription && typeof currentSubscription === 'object') {
            subscription = currentSubscription;
            console.log('Assigned directly from object:', subscription);
        } else {
            console.log('Unexpected subscription data format - currentSubscription:', currentSubscription);
            console.log('currentSubscription is null/undefined:', currentSubscription == null);
            console.log('typeof currentSubscription:', typeof currentSubscription);
            return res.status(500).json({ success: false, error: 'Unexpected database response format' });
        }

        console.log('Final subscription assignment:', subscription);

        // Check if subscription can be resumed
        if (subscription.status !== 'paused') {
            console.log('Subscription status is not paused:', subscription.status);
            return res.status(400).json({
                success: false,
                error: `Subscription is not paused (current status: ${subscription.status})`
            });
        }

        // Check if subscription has expired
        const now = new Date();
        const endDate = new Date(subscription.end_date);
        console.log('Current date:', now);
        console.log('Subscription end date:', endDate);
        console.log('End date < now:', endDate < now);

        if (endDate < now) {
            console.log('Subscription has expired');
            return res.status(400).json({
                success: false,
                error: 'Your subscription has expired. Please create a new subscription.'
            });
        }

        // Update subscription status to active
        console.log('Updating subscription status to active...');
        const updateResult = await db.query(
            'UPDATE subscriptions SET status = ?, paused_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['active', subscriptionId]
        );
        console.log('Subscription update result:', updateResult);

        // Find the correct user to update - try user_id first, then fallback to username lookup
        let userIdToUpdate = subscription.user_id;
        console.log('Original user_id from subscription:', userIdToUpdate);

        // Verify the user exists with the user_id
        console.log('Checking if user exists with user_id:', subscription.user_id);
        const [userCheck] = await db.query('SELECT id FROM users WHERE id = ?', [subscription.user_id]);
        console.log('User check result:', userCheck);

        if (!userCheck || userCheck.length === 0) {
            console.log('User not found with user_id, trying fallback lookup...');
            // Fallback: find user by username/email
            const [userByName] = await db.query(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [subscription.username, subscription.username]
            );
            console.log('Fallback user lookup result:', userByName);

            if (userByName && userByName.length > 0) {
                userIdToUpdate = userByName[0].id;
                console.log(`Updated user_id from ${subscription.user_id} to ${userIdToUpdate} for subscription ${subscriptionId}`);
            } else {
                console.warn(`Could not find user for subscription ${subscriptionId} with username ${subscription.username}`);
                // Continue without updating user table
                userIdToUpdate = null;
            }
        }

        // Update users table subscription status if we found a valid user
        if (userIdToUpdate) {
            console.log('Updating users table with user_id:', userIdToUpdate);
            const userUpdateResult = await db.query(
                'UPDATE users SET subscription_status = ? WHERE id = ?',
                ['active', userIdToUpdate]
            );
            console.log('User update result:', userUpdateResult);
        } else {
            console.log('Skipping user table update due to no valid user_id');
        }

        // Invalidate user subscription cache (optional - will fail gracefully if Redis is down)
        try {
            console.log('Invalidating cache for user_id:', userIdToUpdate || subscription.user_id);
            await subscriptionCache.invalidateUserSubscriptions(userIdToUpdate || subscription.user_id);
        } catch (cacheError) {
            console.log('Cache invalidation failed, but continuing:', cacheError.message);
        }

        console.log('Resume operation completed successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error resuming subscription:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, error: 'Failed to resume subscription' });
    }
});



// Helper function to calculate next delivery date
function calculateNextDeliveryDate(startDate, frequency) {
    const date = new Date(startDate);

    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
    }

    return date.toISOString().split('T')[0];
}

module.exports = router;
