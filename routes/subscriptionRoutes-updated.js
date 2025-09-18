const express = require('express');
const router = express.Router();
const db = require('../db');
const DeliveryZone = require('../models/DeliveryZone');
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

        // Calculate next delivery date based on frequency
        const nextDeliveryDate = new Date(startDate);
        if (frequency === 'daily') {
            nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
        } else if (frequency === 'weekly') {
            nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
        } else if (frequency === 'monthly') {
            nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
        }

        // Calculate total amount (example pricing)
        const pricePerUnit = milkType === '500ml' ? 25 : 45;
        const totalAmount = pricePerUnit * quantity;

        const subscription = await Subscription.create({
            userId,
            milkType,
            quantity,
            frequency,
            deliveryAddress,
            deliveryZoneId,
            preferredDeliveryTime,
            startDate,
            nextDeliveryDate,
            totalAmount
        });

        res.json({
            success: true,
            subscription,
            message: 'Subscription created successfully'
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
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
        
        await Subscription.update(
            { status: 'active' },
            { where: { id } }
        );
        
        res.json({
            success: true,
            message: 'Subscription resumed successfully'
        });
    } catch (error) {
        console.error('Error resuming subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
