const cache = require('../utils/cache');

class CacheMiddleware {
    // Cache GET requests
    static cacheGet(duration = 300) {
        return async (req, res, next) => {
            if (req.method !== 'GET') return next();
            const key = cache.generateKey('api', req.originalUrl, req.user?.id || 'anonymous');
            try {
                const cached = await cache.get(key);
                if (cached) return res.json(cached);

                const originalSend = res.json;
                res.json = function(data) {
                    cache.set(key, data, duration);
                    originalSend.call(this, data);
                };
                next();
            } catch (err) {
                console.error('Cache middleware error:', err);
                next();
            }
        };
    }

    // Cache user-specific data
    static cacheUserData(duration = 600) {
        return async (req, res, next) => {
            if (!req.user) return next();
            const key = cache.generateKey('user', req.user.id, req.originalUrl);
            try {
                const cached = await cache.get(key);
                if (cached) return res.json(cached);

                const originalSend = res.json;
                res.json = function(data) {
                    cache.set(key, data, duration);
                    originalSend.call(this, data);
                };
                next();
            } catch (err) {
                console.error('User cache middleware error:', err);
                next();
            }
        };
    }

    // Clear cache on POST/PUT/DELETE
    static clearCache(pattern) {
        return async (req, res, next) => {
            if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
                try {
                    await cache.flush(pattern);
                } catch (err) {
                    console.error('Cache clear error:', err);
                }
            }
            next();
        };
    }

    // Rate limiting using cache
    static rateLimit(maxRequests = 100, windowMs = 60000) {
        return async (req, res, next) => {
            const key = cache.generateKey('rate_limit', req.ip, req.originalUrl);
            try {
                const requests = (await cache.get(key)) || 0;
                if (requests >= maxRequests) {
                    return res.status(429).json({
                        error: 'Too many requests',
                        retryAfter: Math.ceil(windowMs / 1000)
                    });
                }
                await cache.set(key, requests + 1, windowMs / 1000);
                next();
            } catch (err) {
                console.error('Rate limit error:', err);
                next();
            }
        };
    }
}

module.exports = CacheMiddleware;
