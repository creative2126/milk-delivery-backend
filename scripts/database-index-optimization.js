const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseIndexOptimizer {
    constructor() {
        this.connection = null;
        this.optimizations = [];
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'sushanth2126',
            database: process.env.DB_NAME || 'milk_delivery',
            port: process.env.DB_PORT || 3306
        });
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
        }
    }

    // Analyze current indexes
    async analyzeCurrentIndexes() {
        console.log('🔍 Analyzing current indexes...');
        
        const queries = [
            // Get all indexes
            `SELECT 
                TABLE_NAME,
                INDEX_NAME,
                COLUMN_NAME,
                NON_UNIQUE,
                COLLATION,
                CARDINALITY,
                SUB_PART,
                PACKED,
                NULLABLE,
                INDEX_TYPE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
            
            // Get table sizes
            `SELECT 
                TABLE_NAME,
                TABLE_ROWS,
                ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size_MB',
                ROUND((DATA_LENGTH / 1024 / 1024), 2) AS 'Data_Size_MB',
                ROUND((INDEX_LENGTH / 1024 / 1024), 2) AS 'Index_Size_MB'
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC`,
            
            // Get slow queries
            `SELECT 
                DIGEST_TEXT as query,
                COUNT_STAR as execution_count,
                SUM_TIMER_WAIT/1000000000 as total_time_seconds,
                AVG_TIMER_WAIT/1000000000 as avg_time_seconds,
                SUM_ROWS_SENT as rows_sent,
                SUM_ROWS_EXAMINED as rows_examined
            FROM performance_schema.events_statements_summary_by_digest
            WHERE SCHEMA_NAME = DATABASE()
            AND COUNT_STAR > 100
            ORDER BY SUM_TIMER_WAIT DESC
            LIMIT 10`
        ];

        const results = {};
        for (let i = 0; i < queries.length; i++) {
            try {
                const [rows] = await this.connection.execute(queries[i]);
                results[`query_${i + 1}`] = rows;
            } catch (error) {
                console.warn(`Query ${i + 1} failed:`, error.message);
                results[`query_${i + 1}`] = [];
            }
        }

        return results;
    }

    // Generate optimized index recommendations
    generateIndexRecommendations(analysis) {
        console.log('🎯 Generating index recommendations...');
        
        const recommendations = {
            create: [],
            drop: [],
            modify: []
        };

        // Critical indexes for performance
        const criticalIndexes = [
            // Users table
            {
                table: 'users',
                index: 'idx_users_email_active',
                columns: ['email', 'is_active'],
                type: 'BTREE'
            },
            {
                table: 'users',
                index: 'idx_users_phone_active',
                columns: ['phone', 'is_active'],
                type: 'BTREE'
            },
            {
                table: 'users',
                index: 'idx_users_created_at',
                columns: ['created_at'],
                type: 'BTREE'
            },

            // Subscriptions table
            {
                table: 'subscriptions',
                index: 'idx_subscriptions_user_status',
                columns: ['user_id', 'status'],
                type: 'BTREE'
            },
            {
                table: 'subscriptions',
                index: 'idx_subscriptions_product_status',
                columns: ['product_id', 'status'],
                type: 'BTREE'
            },
            {
                table: 'subscriptions',
                index: 'idx_subscriptions_end_date',
                columns: ['end_date'],
                type: 'BTREE'
            },
            {
                table: 'subscriptions',
                index: 'idx_subscriptions_next_delivery',
                columns: ['next_delivery_date', 'status'],
                type: 'BTREE'
            },

            // Products table
            {
                table: 'products',
                index: 'idx_products_category_active',
                columns: ['category', 'is_active'],
                type: 'BTREE'
            },
            {
                table: 'products',
                index: 'idx_products_price_range',
                columns: ['price'],
                type: 'BTREE'
            },

            // Addresses table
            {
                table: 'addresses',
                index: 'idx_addresses_user_primary',
                columns: ['user_id', 'is_primary'],
                type: 'BTREE'
            },

            // Payments table
            {
                table: 'payments',
                index: 'idx_payments_subscription_status',
                columns: ['subscription_id', 'status'],
                type: 'BTREE'
            },
            {
                table: 'payments',
                index: 'idx_payments_user_date',
                columns: ['user_id', 'created_at'],
                type: 'BTREE'
            },

            // Orders table
            {
                table: 'orders',
                index: 'idx_orders_user_status',
                columns: ['user_id', 'status'],
                type: 'BTREE'
            },
            {
                table: 'orders',
                index: 'idx_orders_date_status',
                columns: ['order_date', 'status'],
                type: 'BTREE'
            }
        ];

        recommendations.create = criticalIndexes;
        return recommendations;
    }

    // Create optimized indexes
    async createOptimizedIndexes(recommendations) {
        console.log('🔧 Creating optimized indexes...');
        
        const results = {
            created: [],
            skipped: [],
            errors: []
        };

        for (const index of recommendations.create) {
            try {
                // Check if index already exists
                const [existing] = await this.connection.execute(
                    `SELECT COUNT(*) as count 
                     FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = DATABASE() 
                     AND TABLE_NAME = ? 
                     AND INDEX_NAME = ?`,
                    [index.table, index.index]
                );

                if (existing[0].count > 0) {
                    results.skipped.push(`${index.table}.${index.index}`);
                    continue;
                }

                // Create index
                const columns = index.columns.join(', ');
                const sql = `CREATE INDEX ${index.index} ON ${index.table} (${columns})`;
                
                await this.connection.execute(sql);
                results.created.push(`${index.table}.${index.index}`);
                console.log(`✅ Created index: ${index.table}.${index.index}`);
                
            } catch (error) {
                results.errors.push({
                    index: `${index.table}.${index.index}`,
                    error: error.message
                });
                console.error(`❌ Failed to create index ${index.table}.${index.index}:`, error.message);
            }
        }

        return results;
    }

    // Analyze query performance
    async analyzeQueryPerformance() {
        console.log('📊 Analyzing query performance...');
        
        const testQueries = [
            {
                name: 'User Profile Query',
                query: 'SELECT u.*, a.* FROM users u LEFT JOIN addresses a ON u.id = a.user_id WHERE u.email = ?',
                params: ['test@example.com']
            },
            {
                name: 'Active Subscriptions',
                query: 'SELECT * FROM subscriptions WHERE user_id = ? AND status = ?',
                params: [1, 'active']
            },
            {
                name: 'Product Search',
                query: 'SELECT * FROM products WHERE category = ? AND is_active = ?',
                params: ['milk', 1]
            },
            {
                name: 'Payment History',
                query: 'SELECT * FROM payments WHERE subscription_id = ? ORDER BY created_at DESC',
                params: [1]
            }
        ];

        const results = [];
        
        for (const testQuery of testQueries) {
            try {
                const startTime = Date.now();
                await this.connection.execute(testQuery.query, testQuery.params);
                const executionTime = Date.now() - startTime;
                
                results.push({
                    query: testQuery.name,
                    executionTime: executionTime,
                    status: executionTime < 100 ? 'fast' : executionTime < 500 ? 'medium' : 'slow'
                });
            } catch (error) {
                results.push({
                    query: testQuery.name,
                    error: error.message,
                    status: 'error'
                });
            }
        }

        return results;
    }

    // Generate optimization report
    generateOptimizationReport(analysis, recommendations, results, performance) {
        const report = {
            timestamp: new Date().toISOString(),
            analysis: {
                currentIndexes: analysis.query_1?.length || 0,
                tableSizes: analysis.query_2 || [],
                slowQueries: analysis.query_3 || []
            },
            recommendations: recommendations,
            implementation: results,
            performance: performance,
            summary: {
                totalIndexesCreated: results.created.length,
                totalIndexesSkipped: results.skipped.length,
                totalErrors: results.errors.length,
                averageQueryTime: performance.reduce((sum, p) => sum + (p.executionTime || 0), 0) / performance.length
            }
        };

        return report;
    }

    // Main optimization process
    async optimize() {
        console.log('🚀 Starting database index optimization...\n');
        
        try {
            await this.connect();
            
            // Step 1: Analyze current state
            const analysis = await this.analyzeCurrentIndexes();
            
            // Step 2: Generate recommendations
            const recommendations = this.generateIndexRecommendations(analysis);
            
            // Step 3: Create optimized indexes
            const results = await this.createOptimizedIndexes(recommendations);
            
            // Step 4: Analyze performance
            const performance = await this.analyzeQueryPerformance();
            
            // Step 5: Generate report
            const report = this.generateOptimizationReport(analysis, recommendations, results, performance);
            
            console.log('\n📋 Optimization Report:');
            console.log('=====================');
            console.log(`✅ Indexes Created: ${results.created.length}`);
            console.log(`⏭️  Indexes Skipped: ${results.skipped.length}`);
            console.log(`❌ Errors: ${results.errors.length}`);
            console.log(`⚡ Average Query Time: ${report.summary.averageQueryTime.toFixed(2)}ms`);
            
            // Save report to file
            const fs = require('fs');
            fs.writeFileSync('database-optimization-report.json', JSON.stringify(report, null, 2));
            console.log('\n📄 Report saved to: database-optimization-report.json');
            
            return report;
            
        } catch (error) {
            console.error('❌ Optimization failed:', error);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

// Run optimization if called directly
if (require.main === module) {
    const optimizer = new DatabaseIndexOptimizer();
    optimizer.optimize()
        .then(report => {
            console.log('\n✅ Database index optimization completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Optimization failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseIndexOptimizer;
