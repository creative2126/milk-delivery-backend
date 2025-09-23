const mysql = require('mysql2/promise');
const queryOptimizer = require('../backend/utils/queryOptimizer');
require('dotenv').config();

async function optimizeDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'sushanth2126',
        database: process.env.DB_NAME || 'milk_delivery'
    });

    try {
        console.log('🚀 Starting database optimization...');

        // Create optimized indexes
        const indexes = queryOptimizer.getIndexSuggestions();
        console.log('📊 Creating performance indexes...');
        
        for (const index of indexes) {
            try {
                await connection.execute(index);
                console.log(`✅ Created index: ${index}`);
            } catch (error) {
                if (error.code !== 'ER_DUP_KEYNAME') {
                    console.warn(`⚠️ Index creation failed: ${error.message}`);
                }
            }
        }

        // Analyze table statistics
        console.log('📈 Analyzing table statistics...');
        const tables = ['users', 'subscriptions', 'products', 'payments', 'addresses'];
        
        for (const table of tables) {
            await connection.execute(`ANALYZE TABLE ${table}`);
            console.log(`✅ Analyzed table: ${table}`);
        }

        // Optimize table storage
        console.log('🔧 Optimizing table storage...');
        for (const table of tables) {
            await connection.execute(`OPTIMIZE TABLE ${table}`);
            console.log(`✅ Optimized table: ${table}`);
        }

        // Create materialized view for dashboard data
        console.log('📊 Creating dashboard materialized view...');
        await connection.execute(`
            CREATE OR REPLACE VIEW user_dashboard_stats AS
            SELECT 
                u.id as user_id,
                COUNT(s.id) as total_subscriptions,
                SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                SUM(CASE WHEN s.status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
                SUM(s.total_amount) as total_spent,
                AVG(s.total_amount) as avg_subscription_value,
                MAX(s.created_at) as last_subscription_date
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id
            GROUP BY u.id
        `);

        // Create stored procedures for common queries
        console.log('🔧 Creating stored procedures...');
        await connection.execute(`
            CREATE PROCEDURE IF NOT EXISTS GetUserProfile(IN userId INT)
            BEGIN
                SELECT 
                    u.id, u.username, u.email, u.name, u.phone, u.created_at,
                    a.address_line1, a.address_line2, a.city, a.state, a.zip_code, a.landmark,
                    COUNT(s.id) as active_subscriptions,
                    MAX(s.created_at) as last_subscription_date
                FROM users u
                LEFT JOIN addresses a ON u.id = a.user_id
                LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
                WHERE u.id = userId
                GROUP BY u.id;
            END
        `);

        await connection.execute(`
            CREATE PROCEDURE IF NOT EXISTS GetUserSubscriptions(IN userId INT, IN pageNum INT, IN pageSize INT)
            BEGIN
                DECLARE offsetVal INT DEFAULT (pageNum - 1) * pageSize;
                
                SELECT 
                    s.*, 
                    p.name as product_name, 
                    p.description, 
                    p.price, 
                    p.image_url,
                    p.category,
                    DATEDIFF(s.end_date, CURDATE()) as remaining_days
                FROM subscriptions s
                JOIN products p ON s.product_id = p.id
                WHERE s.user_id = userId AND s.status IN ('active', 'paused')
                ORDER BY s.created_at DESC
                LIMIT pageSize OFFSET offsetVal;
                
                SELECT COUNT(*) as total
                FROM subscriptions
                WHERE user_id = userId AND status IN ('active', 'paused');
            END
        `);

        console.log('✅ Database optimization completed successfully!');
        
    } catch (error) {
        console.error('❌ Database optimization failed:', error);
    } finally {
        await connection.end();
    }
}

// Run optimization if called directly
if (require.main === module) {
    optimizeDatabase();
}

module.exports = optimizeDatabase;
