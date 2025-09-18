const express = require('express');
const router = express.Router();
const cacheMiddleware = require('../middleware/cacheMiddleware');
const queryOptimizer = require('../utils/queryOptimizer');
const db = require('../db');

// Apply caching middleware to routes
router.use(cacheMiddleware.cacheGet(300)); // 5 minutes cache for GET requests

// Optimized user profile endpoint
router.get('/user/:userId/profile', cacheMiddleware.cacheUserData(600), async (req, res) => {
    try {
        const userId = req.params.userId;
        const query = queryOptimizer.optimizeUserProfileQuery();
        
        const [userData] = await db.query(query, [userId, userId]);
        
        if (!userData || userData.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const response = {
            user: userData[0],
            cache: true,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Optimized subscriptions endpoint with pagination
router.get('/user/:userId/subscriptions', cacheMiddleware.cacheUserData(300), async (req, res) => {
    try {
        const userId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const baseQuery = queryOptimizer.optimizeSubscriptionQuery();
        const paginatedQuery = queryOptimizer.paginateQuery(baseQuery, page, limit);
        
        const [subscriptions] = await db.query(paginatedQuery, [userId]);
        
        // Get total count for pagination
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM subscriptions WHERE user_id = ? AND status IN ("active", "paused")',
            [userId]
        );
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            subscriptions,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit
            },
            cache: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Subscriptions fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
});

// Optimized dashboard endpoint
router.get('/user/:userId/dashboard', cacheMiddleware.cacheUserData(300), async (req, res) => {
    try {
        const userId = req.params.userId;
        const query = queryOptimizer.optimizeDashboardQuery();
        
        const [dashboardData] = await db.query(query, [userId]);
        
        res.json({
            dashboard: dashboardData[0],
            cache: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Batch operations endpoint
router.post('/batch/subscriptions', cacheMiddleware.clearCache('user'), async (req, res) => {
    try {
        const { userIds, action } = req.body;
        
        if (!Array.isArray(userIds) || !action) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        const results = await Promise.all(
            userIds.map(async (userId) => {
                try {
                    // Perform batch operation based on action
                    let result;
                    switch (action) {
                        case 'pause':
                            result = await db.query(
                                'UPDATE subscriptions SET status = "paused" WHERE user_id = ? AND status = "active"',
                                [userId]
                            );
                            break;
                        case 'resume':
                            result = await db.query(
                                'UPDATE subscriptions SET status = "active" WHERE user_id = ? AND status = "paused"',
                                [userId]
                            );
                            break;
                        case 'cancel':
                            result = await db.query(
                                'UPDATE subscriptions SET status = "cancelled" WHERE user_id = ? AND status IN ("active", "paused")',
                                [userId]
                            );
                            break;
                        default:
                            throw new Error('Invalid action');
                    }
                    
                    return { userId, success: true, affectedRows: result.affectedRows };
                } catch (error) {
                    return { userId, success: false, error: error.message };
                }
            })
        );

        res.json({
            results,
            batchOperation: action,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Batch operation error:', error);
        res.status(500).json({ error: 'Failed to perform batch operation' });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Cache statistics endpoint
router.get('/cache/stats', async (req, res) => {
    try {
        // This would need to be implemented based on your cache backend
        res.json({
            message: 'Cache statistics endpoint',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cache stats' });
    }
});

module.exports = router;
