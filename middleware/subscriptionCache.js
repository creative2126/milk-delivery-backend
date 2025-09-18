const redis = require('../config/redis');
const logger = require('../utils/logger');

class SubscriptionCache {
  constructor() {
    this.CACHE_PREFIX = 'subscription:';
    this.USER_SUBSCRIPTIONS_PREFIX = 'user_subs:';
    this.ANALYTICS_PREFIX = 'analytics:';
    this.DEFAULT_TTL = 3600; // 1 hour
  }

  // Cache subscription by ID
  async cacheSubscription(subscription) {
    const key = `${this.CACHE_PREFIX}${subscription.id}`;
    try {
      await redis.set(key, JSON.stringify(subscription), this.DEFAULT_TTL);
      return true;
    } catch (error) {
      logger.error('Error caching subscription:', error);
      return false;
    }
  }

  // Get cached subscription by ID
  async getCachedSubscription(subscriptionId) {
    const key = `${this.CACHE_PREFIX}${subscriptionId}`;
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached subscription:', error);
      return null;
    }
  }

  // Cache user's subscriptions
  async cacheUserSubscriptions(userId, subscriptions) {
    const key = `${this.USER_SUBSCRIPTIONS_PREFIX}${userId}`;
    try {
      await redis.set(key, JSON.stringify(subscriptions), this.DEFAULT_TTL);
      return true;
    } catch (error) {
      logger.error('Error caching user subscriptions:', error);
      return false;
    }
  }

  // Get cached user subscriptions
  async getCachedUserSubscriptions(userId) {
    const key = `${this.USER_SUBSCRIPTIONS_PREFIX}${userId}`;
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached user subscriptions:', error);
      return null;
    }
  }

  // Cache subscription analytics
  async cacheAnalytics(key, data, ttl = 1800) {
    const cacheKey = `${this.ANALYTICS_PREFIX}${key}`;
    try {
      await redis.set(cacheKey, JSON.stringify(data), ttl);
      return true;
    } catch (error) {
      logger.error('Error caching analytics:', error);
      return false;
    }
  }

  // Get cached analytics
  async getCachedAnalytics(key) {
    const cacheKey = `${this.ANALYTICS_PREFIX}${key}`;
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached analytics:', error);
      return null;
    }
  }

  // Invalidate subscription cache
  async invalidateSubscription(subscriptionId) {
    const key = `${this.CACHE_PREFIX}${subscriptionId}`;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Error invalidating subscription cache:', error);
      return false;
    }
  }

  // Invalidate user subscriptions cache
  async invalidateUserSubscriptions(userId) {
    const key = `${this.USER_SUBSCRIPTIONS_PREFIX}${userId}`;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Error invalidating user subscriptions cache:', error);
      return false;
    }
  }

  // Invalidate all subscription-related caches
  async invalidateAllSubscriptionCaches() {
    try {
      await redis.invalidatePattern(`${this.CACHE_PREFIX}*`);
      await redis.invalidatePattern(`${this.USER_SUBSCRIPTIONS_PREFIX}*`);
      return true;
    } catch (error) {
      logger.error('Error invalidating all subscription caches:', error);
      return false;
    }
  }

  // Cache delivery schedule
  async cacheDeliverySchedule(userId, schedule) {
    const key = `delivery_schedule:${userId}`;
    try {
      await redis.set(key, JSON.stringify(schedule), 86400); // 24 hours
      return true;
    } catch (error) {
      logger.error('Error caching delivery schedule:', error);
      return false;
    }
  }

  // Get cached delivery schedule
  async getCachedDeliverySchedule(userId) {
    const key = `delivery_schedule:${userId}`;
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached delivery schedule:', error);
      return null;
    }
  }
}

module.exports = new SubscriptionCache();
