const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      // Promisify Redis methods
      this.getAsync = promisify(this.client.get).bind(this.client);
      this.setAsync = promisify(this.client.set).bind(this.client);
      this.delAsync = promisify(this.client.del).bind(this.client);
      this.existsAsync = promisify(this.client.exists).bind(this.client);
      this.expireAsync = promisify(this.client.expire).bind(this.client);
      this.keysAsync = promisify(this.client.keys).bind(this.client);

    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      return await this.getAsync(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    if (!this.isConnected) return false;
    try {
      const result = await this.setAsync(key, value);
      if (expireInSeconds > 0) {
        await this.expireAsync(key, expireInSeconds);
      }
      return result === 'OK';
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      return await this.delAsync(key) > 0;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;
    try {
      return await this.existsAsync(key) === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected) return;
    try {
      const keys = await this.keysAsync(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.delAsync(key)));
      }
    } catch (error) {
      console.error('Redis invalidate pattern error:', error);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisClient();
