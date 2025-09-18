const db = require('../db');
const logger = require('../utils/logger');
const performanceMonitor = require('../middleware/performanceMonitor');

class SubscriptionAI {
  constructor() {
    this.recommendationCache = new Map();
    this.pricingCache = new Map();
  }

  // AI-powered product recommendations based on user behavior
  static async getPersonalizedRecommendations(userId, limit = 5) {
    const monitor = performanceMonitor.monitorQuery(
      'AI recommendations for user',
      [userId, limit]
    );

    try {
      // Get user behavior data
      const [userBehavior] = await db.execute(`
        SELECT 
          u.id,
          u.preferred_delivery_time,
          u.dietary_preferences,
          COUNT(DISTINCT s.product_id) as total_products,
          AVG(s.quantity) as avg_quantity,
          GROUP_CONCAT(DISTINCT p.category) as preferred_categories,
          GROUP_CONCAT(DISTINCT p.brand) as preferred_brands
        FROM users u
        LEFT JOIN enhanced_subscriptions s ON u.id = s.user_id
        LEFT JOIN products p ON s.product_id = p.id
        WHERE u.id = ?
        GROUP BY u.id
      `, [userId]);

      if (!userBehavior.length) {
        return this.getTrendingProducts(limit);
      }

      const behavior = userBehavior[0];
      
      // Get similar users and their preferences
      const [similarUsers] = await db.execute(`
        SELECT 
          s.product_id,
          p.name,
          p.category,
          p.brand,
          p.price,
          AVG(r.rating) as avg_rating,
          COUNT(s.id) as subscription_count,
          SUM(s.quantity) as total_quantity
        FROM enhanced_subscriptions s
        JOIN products p ON s.product_id = p.id
        LEFT JOIN product_reviews r ON p.id = r.product_id
        WHERE s.user_id IN (
          SELECT user_id 
          FROM enhanced_subscriptions 
          WHERE product_id IN (
            SELECT product_id 
            FROM enhanced_subscriptions 
            WHERE user_id = ?
          )
          AND user_id != ?
        )
        AND s.status = 'active'
        GROUP BY s.product_id
        HAVING avg_rating >= 4.0 OR subscription_count >= 3
        ORDER BY (subscription_count * avg_rating) DESC
        LIMIT ?
      `, [userId, userId, limit]);

      // Get products matching user preferences
      const [preferenceMatches] = await db.execute(`
        SELECT 
          p.*,
          CASE 
            WHEN p.category IN (?) THEN 3
            WHEN p.brand IN (?) THEN 2
            ELSE 1
          END as preference_score,
          AVG(r.rating) as avg_rating,
          COUNT(s.id) as popularity_score
        FROM products p
        LEFT JOIN product_reviews r ON p.id = r.product_id
        LEFT JOIN enhanced_subscriptions s ON p.id = s.product_id
        WHERE p.id NOT IN (
          SELECT product_id 
          FROM enhanced_subscriptions 
          WHERE user_id = ?
        )
        GROUP BY p.id
        ORDER BY (preference_score + avg_rating + LOG10(popularity_score + 1)) DESC
        LIMIT ?
      `, [
        behavior.preferred_categories?.split(',') || [],
        behavior.preferred_brands?.split(',') || [],
        userId,
        limit
      ]);

      monitor.end(similarUsers.length + preferenceMatches.length);
      
      return {
        similarUserRecommendations: similarUsers,
        preferenceBased: preferenceMatches,
        confidenceScore: this.calculateConfidenceScore(behavior, similarUsers, preferenceMatches)
      };
    } catch (error) {
      logger.error('Error getting AI recommendations:', error);
      throw error;
    }
  }

  // Dynamic pricing based on demand, user loyalty, and market factors
  static async calculateDynamicPrice(productId, userId = null) {
    const monitor = performanceMonitor.monitorQuery(
      'Dynamic pricing calculation',
      [productId, userId]
    );

    try {
      // Base product info
      const [product] = await db.execute(`
        SELECT * FROM products WHERE id = ?
      `, [productId]);

      if (!product.length) return null;

      const basePrice = product[0].price;
      
      // Demand analysis
      const [demandData] = await db.execute(`
        SELECT 
          COUNT(*) as active_subscriptions,
          AVG(quantity) as avg_quantity,
          SUM(quantity) as total_demand
        FROM enhanced_subscriptions
        WHERE product_id = ? AND status = 'active'
      `, [productId]);

      const demandMultiplier = Math.min(
        1 + (demandData[0].active_subscriptions / 100),
        1.5
      );

      // User loyalty discount
      let loyaltyDiscount = 0;
      if (userId) {
        const [userData] = await db.execute(`
          SELECT 
            COUNT(*) as total_subscriptions,
            SUM(total_amount) as lifetime_value,
            MIN(created_at) as first_subscription
          FROM enhanced_subscriptions
          WHERE user_id = ? AND status = 'active'
        `, [userId]);

        if (userData[0].total_subscriptions > 0) {
          loyaltyDiscount = Math.min(
            userData[0].total_subscriptions * 0.02,
            0.15
          );
        }
      }

      // Seasonal adjustments
      const month = new Date().getMonth();
      const seasonalMultiplier = [0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.1, 1.05, 1.0, 0.95, 0.9, 0.85][month];

      // Calculate final price
      const dynamicPrice = basePrice * demandMultiplier * seasonalMultiplier * (1 - loyaltyDiscount);
      
      monitor.end(1);
      
      return {
        basePrice,
        dynamicPrice: Math.round(dynamicPrice * 100) / 100,
        savings: Math.round((basePrice - dynamicPrice) * 100) / 100,
        factors: {
          demandMultiplier,
          loyaltyDiscount,
          seasonalMultiplier
        }
      };
    } catch (error) {
      logger.error('Error calculating dynamic price:', error);
      throw error;
    }
  }

  // Churn prediction using subscription patterns
  static async predictChurn(userId) {
    const monitor = performanceMonitor.monitorQuery(
      'Churn prediction for user',
      [userId]
    );

    try {
      const [userMetrics] = await db.execute(`
        SELECT 
          COUNT(*) as total_subscriptions,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
          AVG(DATEDIFF(end_date, start_date)) as avg_subscription_duration,
          SUM(total_amount) as total_spent,
          MAX(updated_at) as last_activity,
          DATEDIFF(CURDATE(), MAX(updated_at)) as days_since_last_activity
        FROM enhanced_subscriptions
        WHERE user_id = ?
      `, [userId]);

      if (!userMetrics[0].total_subscriptions) {
        return { risk: 'low', score: 0.1 };
      }

      const metrics = userMetrics[0];
      let churnScore = 0;

      // Cancellation rate factor
      const cancellationRate = metrics.cancelled_subscriptions / metrics.total_subscriptions;
      churnScore += cancellationRate * 0.3;

      // Activity factor
      if (metrics.days_since_last_activity > 30) {
        churnScore += Math.min(metrics.days_since_last_activity / 100, 0.3);
      }

      // Subscription duration factor
      if (metrics.avg_subscription_duration < 30) {
        churnScore += 0.2;
      }

      // Spending pattern factor
      const avgSpending = metrics.total_spent / metrics.total_subscriptions;
      if (avgSpending < 50) {
        churnScore += 0.2;
      }

      // Determine risk level
      let risk = 'low';
      if (churnScore > 0.7) risk = 'high';
      else if (churnScore > 0.4) risk = 'medium';

      monitor.end(1);
      
      return {
        risk,
        score: Math.round(churnScore * 100) / 100,
        factors: {
          cancellationRate,
          daysSinceLastActivity: metrics.days_since_last_activity,
          avgSubscriptionDuration: metrics.avg_subscription_duration,
          avgSpending
        }
      };
    } catch (error) {
      logger.error('Error predicting churn:', error);
      throw error;
    }
  }

  // Get trending products based on subscription growth
  static async getTrendingProducts(limit = 10) {
    const monitor = performanceMonitor.monitorQuery(
      'Get trending products',
      [limit]
    );

    try {
      const [trending] = await db.execute(`
        SELECT 
          p.*,
          COUNT(s.id) as subscription_count,
          COUNT(s.id) - LAG(COUNT(s.id)) OVER (ORDER BY DATE(s.created_at)) as growth_rate,
          AVG(r.rating) as avg_rating
        FROM products p
        JOIN enhanced_subscriptions s ON p.id = s.product_id
        LEFT JOIN product_reviews r ON p.id = r.product_id
        WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND s.status = 'active'
        GROUP BY p.id
        ORDER BY growth_rate DESC, subscription_count DESC
        LIMIT ?
      `, [limit]);

      monitor.end(trending.length);
      return trending;
    } catch (error) {
      logger.error('Error getting trending products:', error);
      throw error;
    }
  }

  static calculateConfidenceScore(behavior, similarUsers, preferenceMatches) {
    let score = 0.5; // Base confidence
    
    if (behavior.total_products > 0) score += 0.2;
    if (behavior.preferred_categories) score += 0.15;
    if (behavior.preferred_brands) score += 0.15;
    if (similarUsers.length > 0) score += 0.1;
    if (preferenceMatches.length > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}

module.exports = SubscriptionAI;
