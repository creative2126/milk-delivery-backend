// backend/routes/enhancedSubscriptionRoutes.js
const express = require('express');
const router = express.Router();
const EnhancedSubscription = require('../models/EnhancedSubscription');
const AdvancedAnalytics = require('../models/AdvancedAnalytics');
const {
    validateEnhancedSubscription,
    validateSubscriptionUpdate,
    validatePauseSubscription,
    validateResumeSubscription,
    validateCancelSubscription,
    validateSkipDelivery,
    validateAddDelivery,
    validateGetSubscriptions,
    handleValidationErrors
} = require('../middleware/enhancedSubscriptionValidation');
const { cacheMiddleware, invalidateCache } = require('../middleware/cacheMiddleware');
const logger = require('../utils/logger');

// ✅ Apply performance middleware safely
const performanceMiddleware = (req, res, next) => next();
router.use(performanceMiddleware);


// ✅ Helper for async route error handling
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// =========================
// CREATE ENHANCED SUBSCRIPTION
// =========================
router.post(
    '/',
    validateEnhancedSubscription,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscriptionData = {
            ...req.body,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const subscription = await EnhancedSubscription.create(subscriptionData);

        await AdvancedAnalytics.logEvent('subscription_created', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            productId: subscription.productId,
            quantity: subscription.quantity,
            frequency: subscription.frequency,
            price: subscription.pricePerUnit * subscription.quantity
        });

        logger.info(`Enhanced subscription created: ${subscription.id}`);

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: subscription
        });
    })
);

// =========================
// GET ALL SUBSCRIPTIONS (FILTER + PAGINATION)
// =========================
router.get(
    '/',
    validateGetSubscriptions,
    handleValidationErrors,
    (typeof cacheMiddleware === "function" ? cacheMiddleware(300) : (req,res,next)=>next()), // ✅ Safe cache
    asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            status,
            userId,
            productId,
            startDate,
            endDate,
            frequency,
            autoRenew,
            billingCycle,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (productId) where.productId = productId;
        if (frequency) where.frequency = frequency;
        if (autoRenew !== undefined) where.autoRenew = autoRenew === 'true';
        if (billingCycle) where.billingCycle = billingCycle;

        if (startDate || endDate) {
            where.startDate = {};
            if (startDate) where.startDate[EnhancedSubscription.sequelize.Op.gte] = new Date(startDate);
            if (endDate) where.startDate[EnhancedSubscription.sequelize.Op.lte] = new Date(endDate);
        }

        const offset = (page - 1) * limit;

        const { count, rows: subscriptions } = await EnhancedSubscription.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [[sortBy, sortOrder.toUpperCase()]],
            include: ['user', 'product', 'address']
        });

        res.json({
            success: true,
            data: {
                subscriptions,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    })
);

// =========================
// GET SUBSCRIPTION BY ID
// =========================
router.get(
    '/:id',
    (typeof cacheMiddleware === "function" ? cacheMiddleware(300) : (req,res,next)=>next()),
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id, {
            include: ['user', 'product', 'address', 'deliveries', 'payments']
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        res.json({
            success: true,
            data: subscription
        });
    })
);

// =========================
// UPDATE SUBSCRIPTION
// =========================
router.put(
    '/:id',
    validateSubscriptionUpdate,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        await subscription.update({
            ...req.body,
            updatedAt: new Date()
        });

        await AdvancedAnalytics.logEvent('subscription_updated', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            changes: Object.keys(req.body)
        });

        invalidateCache(`/api/enhanced-subscriptions/${req.params.id}`);
        invalidateCache('/api/enhanced-subscriptions');

        logger.info(`Enhanced subscription updated: ${subscription.id}`);

        res.json({
            success: true,
            message: 'Subscription updated successfully',
            data: subscription
        });
    })
);

// =========================
// PAUSE SUBSCRIPTION
// =========================
router.post(
    '/:id/pause',
    validatePauseSubscription,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (subscription.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Only active subscriptions can be paused' });
        }

        await subscription.update({
            status: 'paused',
            pausedAt: new Date(),
            updatedAt: new Date()
        });

        await AdvancedAnalytics.logEvent('subscription_paused', {
            subscriptionId: subscription.id,
            userId: subscription.userId
        });

        invalidateCache(`/api/enhanced-subscriptions/${req.params.id}`);
        invalidateCache('/api/enhanced-subscriptions');

        logger.info(`Enhanced subscription paused: ${subscription.id}`);

        res.json({ success: true, message: 'Subscription paused successfully', data: subscription });
    })
);

// =========================
// RESUME SUBSCRIPTION
// =========================
router.post(
    '/:id/resume',
    validateResumeSubscription,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (subscription.status !== 'paused') {
            return res.status(400).json({ success: false, message: 'Only paused subscriptions can be resumed' });
        }

        await subscription.update({
            status: 'active',
            resumedAt: new Date(),
            updatedAt: new Date()
        });

        await AdvancedAnalytics.logEvent('subscription_resumed', {
            subscriptionId: subscription.id,
            userId: subscription.userId
        });

        invalidateCache(`/api/enhanced-subscriptions/${req.params.id}`);
        invalidateCache('/api/enhanced-subscriptions');

        logger.info(`Enhanced subscription resumed: ${subscription.id}`);

        res.json({ success: true, message: 'Subscription resumed successfully', data: subscription });
    })
);

// =========================
// CANCEL SUBSCRIPTION
// =========================
router.post(
    '/:id/cancel',
    validateCancelSubscription,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (subscription.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Subscription is already cancelled' });
        }

        const { reason, feedback } = req.body;

        await subscription.update({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationReason: reason,
            cancellationFeedback: feedback,
            updatedAt: new Date()
        });

        await AdvancedAnalytics.logEvent('subscription_cancelled', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            reason,
            feedback
        });

        invalidateCache(`/api/enhanced-subscriptions/${req.params.id}`);
        invalidateCache('/api/enhanced-subscriptions');

        logger.info(`Enhanced subscription cancelled: ${subscription.id}`);

        res.json({ success: true, message: 'Subscription cancelled successfully', data: subscription });
    })
);

// =========================
// SKIP DELIVERY
// =========================
router.post(
    '/:id/skip-delivery',
    validateSkipDelivery,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const { date, reason } = req.body;
        const skipDate = new Date(date);

        const skippedDeliveries = subscription.skippedDeliveries || [];
        skippedDeliveries.push({ date: skipDate, reason, skippedAt: new Date() });

        await subscription.update({ skippedDeliveries, updatedAt: new Date() });

        await AdvancedAnalytics.logEvent('delivery_skipped', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            skipDate,
            reason
        });

        invalidateCache(`/api/enhanced-subscriptions/${req.params.id}`);

        logger.info(`Delivery skipped for subscription: ${subscription.id}`);

        res.json({ success: true, message: 'Delivery skipped successfully', data: subscription });
    })
);

// =========================
// ADD EXTRA DELIVERY
// =========================
router.post(
    '/:id/add-delivery',
    validateAddDelivery,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const { date, quantity = subscription.quantity } = req.body;
        const addDate = new Date(date);

        const extraDeliveries = subscription.extraDeliveries || [];
        extraDeliveries.push({ date: addDate, quantity, addedAt: new Date() });

        await subscription.update({ extraDeliveries, updatedAt: new Date() });

        await AdvancedAnalytics.logEvent('extra_delivery_added', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            addDate,
            quantity
        });

        invalidateCache(`/api/enhanced-subscriptions/${req.params.id}`);

        logger.info(`Extra delivery added for subscription: ${subscription.id}`);

        res.json({ success: true, message: 'Extra delivery added successfully', data: subscription });
    })
);

// =========================
// SUBSCRIPTION ANALYTICS
// =========================
router.get(
    '/:id/analytics',
    asyncHandler(async (req, res) => {
        const subscription = await EnhancedSubscription.findByPk(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const analytics = await AdvancedAnalytics.getSubscriptionAnalytics(req.params.id);

        res.json({ success: true, data: analytics });
    })
);

module.exports = router;
