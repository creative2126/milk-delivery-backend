const express = require('express');
const router = express.Router();
const db = require('../db');
const DeliveryZone = require('../models/DeliveryZone');
const User = require('../models/User')(db.sequelize, db.Sequelize.DataTypes);
const Subscription = require('../models/Subscription');

// Get subscription page
router.get('/subscription', (req, res) => {
    res.sendFile('subscription.html', { root: './public' });
});

// Get subscription data with delivery zones
router.get('/api/subscription-data', async (req, res) => {
    try {
        const [milkTypes] = await db.query('SELECT * FROM milk_types WHERE is_active = 1');
        const [deliveryZones] = await db.query('SELECT * FROM delivery_zones WHERE isActive = 1');
        
        res.json({
            milkTypes,
            deliveryZones,
            deliveryTimeSlots: ['6:00 AM - 8:00 AM', '8:00 AM - 10:00 AM', '10:00 AM - 12:00 PM']
        });
    } catch (error) {
        console.error('Error fetching subscription data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check delivery availability for address
router.post('/api/check-delivery-availability', async (req, res) => {
    try {
        const { postalCode, address } = req.body;
        
        const [deliveryZone] = await db.query(
            'SELECT * FROM delivery_zones WHERE JSON_CONTAINS(postalCodes, ?) AND isActive = 1',
            [JSON.stringify(postalCode)]
        );
        
        if (deliveryZone.length > 0) {
            res.json({
                available: true,
                zone: deliveryZone[0],
                deliveryDays: deliveryZone[0].deliveryDays,
                deliveryTimeSlots: deliveryZone[0].deliveryTimeSlots
            });
        } else {
            res.json({
                available: false,
                message: 'Delivery not available for this location'
            });
        }
    } catch (error) {
        console.error('Error checking delivery availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new subscription
router.post('/api/subscriptions', async (req, res) => {
    try {
        const {
            userId,
            milkType,
            quantity,
            frequency,
            deliveryAddress,
            deliveryZoneId,
            preferredDeliveryTime,
            startDate
        } = req.body;

        // Calculate subscription end date based on frequency
        const subscriptionEndDate = new Date(startDate);
        if (frequency === 'daily') {
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 1);
        } else if (frequency === 'weekly') {
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 7);
        } else if (frequency === 'monthly') {
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        }

        // Update user subscription info in users table
        const [updatedRows] = await User.update({
            subscription_type: milkType,
            subscription_duration: frequency,
            subscription_status: 'active',
            subscription_start_date: startDate,
            subscription_end_date: subscriptionEndDate
        }, {
            where: { id: userId }
        });

        if (updatedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Subscription updated successfully in users table'
        });
    } catch (error) {
        console.error('Error updating subscription in users table:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user subscriptions
router.get('/api/subscriptions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [subscriptions] = await db.query(
            `SELECT s.*, dz.zoneName, dz.deliveryDays 
             FROM subscriptions s 
             JOIN delivery_zones dz ON s.deliveryZoneId = dz.id 
             WHERE s.userId = ? 
             ORDER BY s.createdAt DESC`,
            [userId]
        );
        
        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update subscription
router.put('/api/subscriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        await Subscription.update(updates, {
            where: { id }
        });
        
        res.json({
            success: true,
            message: 'Subscription updated successfully'
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cancel subscription
router.delete('/api/subscriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await Subscription.update(
            { status: 'cancelled' },
            { where: { id } }
        );
        
        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Pause subscription
router.put('/api/subscriptions/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;
        
        await Subscription.update(
            { status: 'paused' },
            { where: { id } }
        );
        
        res.json({
            success: true,
            message: 'Subscription paused successfully'
        });
    } catch (error) {
        console.error('Error pausing subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Resume subscription
router.put('/api/subscriptions/:id/resume', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body || {};

        console.log(`Resume subscription request: ID=${id}, Username=${username}`);

        // First, check if subscription exists
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            console.log(`Subscription ${id} not found`);
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        console.log(`Found subscription ${id}:`, {
            status: subscription.status,
            subscription_status: subscription.subscription_status,
            user_id: subscription.user_id
        });

        // Check if subscription is in a pausable state
        if (subscription.status !== 'paused' && subscription.subscription_status !== 'paused') {
            console.log(`Subscription ${id} is not paused. Current status: ${subscription.status || subscription.subscription_status}`);
            return res.status(400).json({
                success: false,
                message: 'Subscription is not paused and cannot be resumed'
            });
        }

        // Check if subscription has expired
        if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
            console.log(`Subscription ${id} has expired`);
            return res.status(400).json({
                success: false,
                message: 'Subscription has expired and cannot be resumed'
            });
        }

        // Update both status fields to ensure consistency
        const updateData = {
            status: 'active',
            subscription_status: 'active',
            updated_at: new Date()
        };

        const [updateCount] = await Subscription.update(updateData, {
            where: { id }
        });

        console.log(`Updated ${updateCount} subscription(s) to active status`);

        if (updateCount === 0) {
            console.log(`Failed to update subscription ${id}`);
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
                status: 'active',
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
