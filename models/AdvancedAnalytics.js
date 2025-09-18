const db = require('../db');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class AdvancedAnalytics {
  constructor() {
    this.cacheKey = 'analytics:';
    this.cacheTTL = 300; // 5 minutes
  }

  // Real-time dashboard metrics
  static async getRealTimeMetrics() {
    const cacheKey = 'analytics:realtime';
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const monitor = performanceMonitor.monitorQuery(
      'Real-time analytics metrics'
    );

    try {
      const [
        [totalUsers],
        [activeSubscriptions],
        [revenueToday],
        [revenueThisMonth],
        [pendingDeliveries],
        [churnRate],
        [avgOrderValue],
        [topProducts]
      ] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM users WHERE status = "active"'),
        db.execute('SELECT COUNT(*) as count FROM enhanced_subscriptions WHERE status = "active"'),
        db.execute(`
          SELECT COALESCE(SUM(total_amount), 0) as revenue 
          FROM enhanced_subscriptions 
          WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'
        `),
        db.execute(`
          SELECT COALESCE(SUM(total_amount), 0) as revenue 
          FROM enhanced_subscriptions 
          WHERE MONTH(created_at) = MONTH(CURDATE()) 
            AND YEAR(created_at) = YEAR(CURDATE())
            AND status != 'cancelled'
        `),
        db.execute(`
          SELECT COUNT(*) as count 
          FROM delivery_schedule 
          WHERE delivery_date = CURDATE() AND status = 'pending'
        `),
        db.execute(`
          SELECT 
            (COUNT(CASE WHEN status = 'cancelled' THEN 1 END) * 100.0 / COUNT(*)) as rate
          FROM enhanced_subscriptions
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `),
        db.execute(`
          SELECT AVG(total_amount) as avg_value
          FROM enhanced_subscriptions
          WHERE status != 'cancelled'
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `),
        db.execute(`
          SELECT 
            p.name,
            COUNT(s.id) as subscription_count,
            SUM(s.quantity) as total_quantity
          FROM products p
          JOIN enhanced_subscriptions s ON p.id = s.product_id
          WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY p.id
          ORDER BY subscription_count DESC
          LIMIT 5
        `)
      ]);

      const metrics = {
        totalUsers: totalUsers[0].count,
        activeSubscriptions: activeSubscriptions[0].count,
        revenueToday: revenueToday[0].revenue,
        revenueThisMonth: revenueThisMonth[0].revenue,
        pendingDeliveries: pendingDeliveries[0].count,
        churnRate: parseFloat(churnRate[0].rate || 0).toFixed(2),
        avgOrderValue: parseFloat(avgOrderValue[0].avg_value || 0).toFixed(2),
        topProducts: topProducts
      };

      await redis.setex(cacheKey, 300, JSON.stringify(metrics));
      monitor.end(1);
      
      return metrics;
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  // Predictive analytics for subscription growth
  static async getGrowthPredictions(days = 30) {
    const monitor = performanceMonitor.monitorQuery(
      'Growth predictions',
      [days]
    );

    try {
      // Historical data
      const [historicalData] = await db.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_subscriptions,
          SUM(total_amount) as daily_revenue,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancellations
        FROM enhanced_subscriptions
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      // Calculate growth trends
      const growthRates = [];
      for (let i = 1; i < historicalData.length; i++) {
        const prev = historicalData[i-1].new_subscriptions;
        const curr = historicalData[i].new_subscriptions;
        growthRates.push(((curr - prev) / prev) * 100);
      }

      const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      
      // Predict future values
      const predictions = [];
      let lastValue = historicalData[historicalData.length - 1].new_subscriptions;
      let lastRevenue = historicalData[historicalData.length - 1].daily_revenue;

      for (let i = 1; i <= days; i++) {
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + i);
        
        lastValue = Math.round(lastValue * (1 + avgGrowthRate / 100));
        lastRevenue = Math.round(lastRevenue * (1 + avgGrowthRate / 100));
        
        predictions.push({
          date: predictedDate.toISOString().split('T')[0],
          predictedSubscriptions: lastValue,
          predictedRevenue: lastRevenue,
          confidence: Math.max(0.7, 1 - (i / days) * 0.3)
        });
      }

      monitor.end(predictions.length);
      return {
        historicalData,
        predictions,
        avgGrowthRate: avgGrowthRate.toFixed(2),
        trend: avgGrowthRate > 0 ? 'upward' : 'downward'
      };
    } catch (error) {
      logger.error('Error getting growth predictions:', error);
      throw error;
    }
  }

  // Customer lifetime value analysis
  static async getCustomerLifetimeValue(userId = null) {
    const monitor = performanceMonitor.monitorQuery(
      'Customer lifetime value analysis',
      [userId]
    );

    try {
      let query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(s.id) as total_subscriptions,
          SUM(s.total_amount) as total_revenue,
          AVG(s.total_amount) as avg_order_value,
          MIN(s.created_at) as first_subscription,
          MAX(s.created_at) as last_subscription,
          DATEDIFF(MAX(s.created_at), MIN(s.created_at)) as customer_lifetime_days,
          SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) as cancellations,
          COUNT(DISTINCT p.category) as categories_purchased
        FROM users u
        JOIN enhanced_subscriptions s ON u.id = s.user_id
        JOIN products p ON s.product_id = p.id
      `;

      const params = [];
      if (userId) {
        query += ' WHERE u.id = ?';
        params.push(userId);
      }

      query += ' GROUP BY u.id ORDER BY total_revenue DESC';

      const [clvData] = await db.execute(query, params);

      const clvAnalysis = clvData.map(user => {
        const lifetimeValue = user.total_revenue;
        const avgOrderValue = user.avg_order_value;
        const purchaseFrequency = user.total_subscriptions / Math.max(user.customer_lifetime_days / 30, 1);
        const predictedCLV = avgOrderValue * purchaseFrequency * 24; // 24 months prediction
        
        return {
          ...user,
          lifetimeValue,
          avgOrderValue: parseFloat(avgOrderValue).toFixed(2),
          purchaseFrequency: purchaseFrequency.toFixed(2),
          predictedCLV: parseFloat(predictedCLV).toFixed(2),
          churnRisk: (user.cancellations / user.total_subscriptions) * 100,
          customerSegment: this.getCustomerSegment(lifetimeValue, predictedCLV)
        };
      });

      monitor.end(clvAnalysis.length);
      return userId ? clvAnalysis[0] : clvAnalysis;
    } catch (error) {
      logger.error('Error calculating CLV:', error);
      throw error;
    }
  }

  // Product performance analytics
  static async getProductPerformance(productId = null) {
    const monitor = performanceMonitor.monitorQuery(
      'Product performance analytics',
      [productId]
    );

    try {
      let query = `
        SELECT 
          p.id,
          p.name,
          p.category,
          p.price,
          COUNT(s.id) as total_subscriptions,
          SUM(s.quantity) as total_quantity_sold,
          SUM(s.total_amount) as total_revenue,
          AVG(r.rating) as avg_rating,
          COUNT(r.id) as total_reviews,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions,
          COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
          MIN(s.created_at) as first_subscription,
          MAX(s.created_at) as last_subscription
        FROM products p
        LEFT JOIN enhanced_subscriptions s ON p.id = s.product_id
        LEFT JOIN product_reviews r ON p.id = r.product_id
      `;

      const params = [];
      if (productId) {
        query += ' WHERE p.id = ?';
        params.push(productId);
      }

      query += ' GROUP BY p.id ORDER BY total_revenue DESC';

      const [performanceData] = await db.execute(query, params);

      const enhancedData = performanceData.map(product => {
        const retentionRate = product.total_subscriptions > 0 
          ? (product.active_subscriptions / product.total_subscriptions) * 100 
          : 0;
        
        const cancellationRate = product.total_subscriptions > 0 
          ? (product.cancelled_subscriptions / product.total_subscriptions) * 100 
          : 0;

        return {
          ...product,
          retentionRate: parseFloat(retentionRate).toFixed(2),
          cancellationRate: parseFloat(cancellationRate).toFixed(2),
          avgRating: parseFloat(product.avg_rating || 0).toFixed(2),
          revenuePerSubscription: product.total_subscriptions > 0 
            ? parseFloat(product.total_revenue / product.total_subscriptions).toFixed(2) 
            : 0,
          performanceScore: this.calculateProductScore(product)
        };
      });

      monitor.end(enhancedData.length);
      return productId ? enhancedData[0] : enhancedData;
    } catch (error) {
      logger.error('Error getting product performance:', error);
      throw error;
    }
  }

  // Geographic analytics
  static async getGeographicAnalytics() {
    const monitor = performanceMonitor.monitorQuery(
      'Geographic analytics'
    );

    try {
      const [geoData] = await db.execute(`
        SELECT 
          dz.name as zone_name,
          dz.zip_codes,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT s.id) as total_subscriptions,
          SUM(s.total_amount) as total_revenue,
          AVG(s.total_amount) as avg_order_value,
          COUNT(DISTINCT p.id) as products_delivered,
          dz.delivery_fee,
          dz.min_order_value
        FROM delivery_zones dz
        LEFT JOIN users u ON JSON_CONTAINS(dz.zip_codes, JSON_QUOTE(u.zip_code))
        LEFT JOIN enhanced_subscriptions s ON u.id = s.user_id
        LEFT JOIN products p ON s.product_id = p.id
        GROUP BY dz.id
        ORDER BY total_revenue DESC
      `);

      const enhancedGeoData = geoData.map(zone => ({
        ...zone,
        penetrationRate: zone.zip_codes ? 
          (zone.total_users / JSON.parse(zone.zip_codes).length) * 100 : 0,
        revenuePerUser: zone.total_users > 0 ? 
          parseFloat(zone.total_revenue / zone.total_users).toFixed(2) : 0,
        marketPotential: this.calculateMarketPotential(zone)
      }));

      monitor.end(enhancedGeoData.length);
      return enhancedGeoData;
    } catch (error) {
      logger.error('Error getting geographic analytics:', error);
      throw error;
    }
  }

  static getCustomerSegment(lifetimeValue, predictedCLV) {
    if (lifetimeValue > 1000) return 'VIP';
    if (lifetimeValue > 500) return 'Loyal';
    if (lifetimeValue > 100) return 'Regular';
    return 'New';
  }

  static calculateProductScore(product) {
    let score = 0;
    score += product.total_revenue / 100;
    score += product.avg_rating * 10;
    score += product.total_subscriptions * 5;
    score -= product.cancellation_rate * 2;
    return Math.round(score * 100) / 100;
  }

  static calculateMarketPotential(zone) {
    // Simple market potential calculation
    const basePotential = 1000; // Estimated households per zip code
    const currentPenetration = zone.total_users || 0;
    const potential = basePotential - currentPenetration;
    return Math.max(potential, 0);
  }
}

module.exports = AdvancedAnalytics;
