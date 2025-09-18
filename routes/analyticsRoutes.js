const express = require('express');
const router = express.Router();
const AdvancedAnalytics = require('../models/AdvancedAnalytics');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');



// Real-time dashboard metrics
router.get('/dashboard/realtime', authenticateToken, async (req, res) => {
  try {
    const metrics = await AdvancedAnalytics.getRealTimeMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching real-time metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time metrics'
    });
  }
});

// Growth predictions
router.get('/predictions/growth', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const predictions = await AdvancedAnalytics.getGrowthPredictions(days);
    
    res.json({
      success: true,
      data: predictions,
      predictionPeriod: days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching growth predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch growth predictions'
    });
  }
});

// Customer lifetime value
router.get('/analytics/clv', authenticateToken, async (req, res) => {
  try {
    const userId = req.query.userId || null;
    const clvData = await AdvancedAnalytics.getCustomerLifetimeValue(userId);
    
    res.json({
      success: true,
      data: clvData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching CLV data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer lifetime value data'
    });
  }
});

// Product performance
router.get('/analytics/products', authenticateToken, async (req, res) => {
  try {
    const productId = req.query.productId || null;
    const performanceData = await AdvancedAnalytics.getProductPerformance(productId);
    
    res.json({
      success: true,
      data: performanceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching product performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product performance data'
    });
  }
});

// Geographic analytics
router.get('/analytics/geographic', authenticateToken, async (req, res) => {
  try {
    const geoData = await AdvancedAnalytics.getGeographicAnalytics();
    
    res.json({
      success: true,
      data: geoData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching geographic analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geographic analytics'
    });
  }
});

// Combined analytics dashboard
router.get('/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const [
      realtimeMetrics,
      growthPredictions,
      productPerformance,
      geographicData
    ] = await Promise.all([
      AdvancedAnalytics.getRealTimeMetrics(),
      AdvancedAnalytics.getGrowthPredictions(30),
      AdvancedAnalytics.getProductPerformance(),
      AdvancedAnalytics.getGeographicAnalytics()
    ]);

    const dashboardData = {
      realtime: realtimeMetrics,
      predictions: growthPredictions,
      products: productPerformance.slice(0, 10), // Top 10 products
      geographic: geographicData,
      summary: {
        totalRevenue: realtimeMetrics.revenueThisMonth,
        totalCustomers: realtimeMetrics.totalUsers,
        growthRate: growthPredictions.avgGrowthRate,
        topZone: geographicData[0] || null
      }
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Export analytics data
router.get('/analytics/export', authenticateToken, async (req, res) => {
  try {
    const { type = 'json', dateRange = '30d' } = req.query;
    
    const [
      realtimeMetrics,
      growthPredictions,
      productPerformance,
      geographicData,
      clvData
    ] = await Promise.all([
      AdvancedAnalytics.getRealTimeMetrics(),
      AdvancedAnalytics.getGrowthPredictions(30),
      AdvancedAnalytics.getProductPerformance(),
      AdvancedAnalytics.getGeographicAnalytics(),
      AdvancedAnalytics.getCustomerLifetimeValue()
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      dateRange,
      metrics: {
        realtime: realtimeMetrics,
        predictions: growthPredictions,
        products: productPerformance,
        geographic: geographicData,
        customerLifetimeValue: clvData.slice(0, 100) // Top 100 customers
      }
    };

    if (type === 'csv') {
      // Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
      
      // Simple CSV conversion for products
      const csvData = productPerformance.map(product => 
        `${product.name},${product.total_revenue},${product.total_subscriptions},${product.avg_rating}`
      ).join('\n');
      
      res.send(`Product Name,Revenue,Subscriptions,Rating\n${csvData}`);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    });
  }
});

module.exports = router;
