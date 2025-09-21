// db.js
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.metrics = {
            connections: {
                active: 0,
                idle: 0,
                queued: 0,
                totalCreated: 0
            },
            queries: {
                total: 0,
                slow: 0,
                errors: 0,
                avgTime: 0,
                totalTime: 0
            }
        };
        this.initializePool();
    }

    initializePool() {
        try {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME,
                port: parseInt(process.env.DB_PORT, 10),
                waitForConnections: true,
                connectionLimit: 25,
                queueLimit: 0,
                connectTimeout: 60000,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0,
                multipleStatements: false,
                charset: 'utf8mb4',
                timezone: 'Z' // Use UTC for consistency
            });

            console.log('✅ Database pool initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize database pool:', error.message);
            throw error;
        }
    }

    async execute(query, params = []) {
        const start = Date.now();
        this.metrics.queries.total++;
        try {
            const [rows] = await this.pool.execute(query, params);

            const duration = Date.now() - start;
            this.metrics.queries.totalTime += duration;
            this.metrics.queries.avgTime =
                this.metrics.queries.totalTime / this.metrics.queries.total;

            if (duration > 500) {
                this.metrics.queries.slow++;
                console.warn(`[SLOW QUERY] ${duration}ms: ${query.substring(0, 100)}...`);
            }
            return rows;
        } catch (err) {
            this.metrics.queries.errors++;
            console.error(`[DB ERROR] ${err.message}`);
            throw err;
        }
    }

    async query(query, params = []) {
        try {
            const [rows] = await this.pool.query(query, params);
            return rows;
        } catch (err) {
            console.error(`[DB QUERY ERROR] ${err.message}`);
            throw err;
        }
    }

    async healthCheck() {
        try {
            const start = Date.now();
            await this.pool.query('SELECT 1');
            const responseTime = Date.now() - start;

            return {
                status: 'healthy',
                responseTime,
                database: process.env.DB_NAME,
                host: process.env.DB_HOST,
                metrics: this.metrics,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async testConnection() {
        try {
            const conn = await this.pool.getConnection();
            console.log('✅ Database connection test successful');
            conn.release();
            return true;
        } catch (err) {
            console.error('❌ Database connection test failed:', err.message);
            return false;
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            successRate:
                this.metrics.queries.total > 0
                    ? (
                          ((this.metrics.queries.total - this.metrics.queries.errors) /
                              this.metrics.queries.total) *
                          100
                      ).toFixed(2) + '%'
                    : 'N/A'
        };
    }

    async close() {
        try {
            await this.pool.end();
            console.log('✅ Database pool closed gracefully');
        } catch (err) {
            console.error('❌ Error closing database pool:', err.message);
        }
    }

    async transaction(callback) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const result = await callback(conn);
            await conn.commit();
            return result;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }
}

// Singleton instance
const dbManager = new DatabaseManager();

// Test connection
dbManager.testConnection().then((ok) => {
    if (ok) console.log('🚀 Database manager ready');
    else console.error('💥 Database manager failed to initialize');
});

module.exports = {
    pool: dbManager.pool,
    execute: dbManager.execute.bind(dbManager),
    query: dbManager.query.bind(dbManager),
    healthCheck: dbManager.healthCheck.bind(dbManager),
    getMetrics: dbManager.getMetrics.bind(dbManager),
    testConnection: dbManager.testConnection.bind(dbManager),
    transaction: dbManager.transaction.bind(dbManager),
    close: dbManager.close.bind(dbManager)
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Closing database connections (SIGINT)...');
    await dbManager.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Closing database connections (SIGTERM)...');
    await dbManager.close();
    process.exit(0);
});
