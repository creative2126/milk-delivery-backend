const NodeCache = require('node-cache');
const redis = require('redis');

class CacheManager {
    constructor() {
        // In-memory cache for hot data
        this.memoryCache = new NodeCache({ 
            stdTTL: 300, // 5 minutes
            checkperiod: 60 // Check for expired keys every minute
        });
        
        // Redis client for persistent caching (optional)
        this.redisClient = null;
        this.initRedis();
    }

    async initRedis() {
        try {
            this.redisClient = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined
            });
            await this.redisClient.connect();
            console.log('✅ Redis connected successfully');
        } catch (error) {
            console.log('⚠️ Redis not available, using memory cache only');
            this.redisClient = null;
        }
    }

    async get(key) {
        // Try memory cache first
        const memoryValue = this.memoryCache.get(key);
        if (memoryValue !== undefined) {
            return memoryValue;
        }

        // Try Redis if available
        if (this.redisClient) {
            try {
                const redisValue = await this.redisClient.get(key);
                if (redisValue) {
                    const parsed = JSON.parse(redisValue);
                    this.memoryCache.set(key, parsed); // Also set in memory cache
                    return parsed;
                }
            } catch (error) {
                console.error('Redis get error:', error);
            }
        }

        return null;
    }

    async set(key, value, ttl = 300) {
        // Set in memory cache
        this.memoryCache.set(key, value, ttl);

        // Set in Redis if available
        if (this.redisClient) {
            try {
                await this.redisClient.setEx(key, ttl, JSON.stringify(value));
            } catch (error) {
                console.error('Redis set error:', error);
            }
        }
    }

    async del(key) {
        this.memoryCache.del(key);
        if (this.redisClient) {
            try {
                await this.redisClient.del(key);
            } catch (error) {
                console.error('Redis del error:', error);
            }
        }
    }

    async flush() {
        this.memoryCache.flushAll();
        if (this.redisClient) {
            try {
                await this.redisClient.flushAll();
            } catch (error) {
                console.error('Redis flush error:', error);
            }
        }
    }

    // Generate cache key
    generateKey(prefix, ...params) {
        return `${prefix}:${params.join(':')}`;
    }
}

module.exports = new CacheManager();
