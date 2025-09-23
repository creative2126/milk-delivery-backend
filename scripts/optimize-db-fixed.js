const mysql = require('mysql2/promise');
const chalk = require('chalk');

class DatabaseOptimizer {
    constructor() {
        this.connection = null;
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sushanth2126',
            database: 'milk_delivery'
        });
        console.log(chalk.green('✅ Connected to database'));
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log(chalk.green('✅ Disconnected from database'));
        }
    }

    async createIndexes() {
        console.log(chalk.blue('📊 Creating performance indexes...'));
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_subscriptions_username ON subscriptions(username)',
            'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
            'CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_subscriptions_amount ON subscriptions(amount)',
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_subscription_status_history_subscription_id ON subscription_status_history(subscription_id)',
            'CREATE INDEX IF NOT EXISTS idx_subscription_status_history_created_at ON subscription_status_history(created_at)'
        ];

        for (const index of indexes) {
            try {
                await this.connection.execute(index);
                console.log(chalk.green(`✅ Created index: ${index.split('ON')[1].trim()}`));
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(chalk.yellow(`⚠️ Index already exists: ${index.split('ON')[1].trim()}`));
                } else {
                    console.log(chalk.red(`❌ Failed to create index: ${error.message}`));
                }
            }
        }
    }

    async analyzeTables() {
        console.log(chalk.blue('📈 Analyzing table statistics...'));
        
        const tables = ['subscriptions', 'users', 'subscription_status_history', 'subscription_errors'];
        
        for (const table of tables) {
            try {
                await this.connection.execute(`ANALYZE TABLE ${table}`);
                console.log(chalk.green(`✅ Analyzed table: ${table}`));
            } catch (error) {
                console.log(chalk.red(`❌ Failed to analyze table ${table}: ${error.message}`));
            }
        }
    }

    async optimizeTables() {
        console.log(chalk.blue('🔧 Optimizing table storage...'));
        
        const tables = ['subscriptions', 'users', 'subscription_status_history', 'subscription_errors'];
        
        for (const table of tables) {
            try {
                await this.connection.execute(`OPTIMIZE TABLE ${table}`);
                console.log(chalk.green(`✅ Optimized table: ${table}`));
            } catch (error) {
                console.log(chalk.red(`❌ Failed to optimize table ${table}: ${error.message}`));
            }
        }
    }

    async createDashboardView() {
        console.log(chalk.blue('📊 Creating dashboard materialized view...'));
        
        try {
            // Drop existing view if it exists
            await this.connection.execute('DROP VIEW IF EXISTS user_dashboard_stats');
            
            // Create new view based on actual schema
            const viewQuery = `
                CREATE OR REPLACE VIEW user_dashboard_stats AS
                SELECT 
                    s.username as user_identifier,
                    COUNT(s.id) as total_subscriptions,
                    SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                    SUM(CASE WHEN s.status = 'paused' THEN 1 ELSE 0 END) as paused_subscriptions,
                    SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
                    SUM(CASE WHEN s.status = 'expired' THEN 1 ELSE 0 END) as expired_subscriptions,
                    SUM(s.amount) as total_spent,
                    AVG(s.amount) as avg_subscription_value,
                    MAX(s.created_at) as last_subscription_date,
                    MIN(s.created_at) as first_subscription_date
                FROM subscriptions s
                GROUP BY s.username
            `;
            
            await this.connection.execute(viewQuery);
            console.log(chalk.green('✅ Created dashboard view: user_dashboard_stats'));
            
            // Create summary view for admin dashboard
            const adminViewQuery = `
                CREATE OR REPLACE VIEW admin_dashboard_summary AS
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM subscriptions) as total_subscriptions,
                    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
                    (SELECT COUNT(*) FROM subscriptions WHERE status = 'paused') as paused_subscriptions,
                    (SELECT COUNT(*) FROM subscriptions WHERE status = 'cancelled') as cancelled_subscriptions,
                    (SELECT SUM(amount) FROM subscriptions) as total_revenue,
                    (SELECT AVG(amount) FROM subscriptions WHERE status = 'active') as avg_active_subscription_value,
                    (SELECT COUNT(*) FROM subscriptions WHERE DATE(created_at) = CURDATE()) as today_subscriptions,
                    (SELECT COUNT(*) FROM subscriptions WHERE WEEK(created_at) = WEEK(CURDATE())) as this_week_subscriptions,
                    (SELECT COUNT(*) FROM subscriptions WHERE MONTH(created_at) = MONTH(CURDATE())) as this_month_subscriptions
            `;
            
            await this.connection.execute(adminViewQuery);
            console.log(chalk.green('✅ Created admin dashboard view: admin_dashboard_summary'));
            
        } catch (error) {
            console.log(chalk.red(`❌ Failed to create dashboard views: ${error.message}`));
        }
    }

    async updateTableSchema() {
        console.log(chalk.blue('🔄 Updating table schema for optimization...'));
        
        try {
            // Add missing columns if needed
            const columnsToAdd = [
                'ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id INT AFTER id',
                'ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS end_date DATE AFTER duration',
                'ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS product_id INT AFTER subscription_type'
            ];
            
            for (const column of columnsToAdd) {
                try {
                    await this.connection.execute(column);
                    console.log(chalk.green(`✅ Added column: ${column.split('ADD COLUMN')[1].split(' ')[2]}`));
                } catch (error) {
                    if (!error.message.includes('Duplicate column name')) {
                        console.log(chalk.yellow(`⚠️ Column already exists or failed: ${error.message}`));
                    }
                }
            }
            
        } catch (error) {
            console.log(chalk.red(`❌ Failed to update schema: ${error.message}`));
        }
    }

    async runOptimization() {
        console.log(chalk.cyan('🚀 Starting database optimization...\n'));
        
        try {
            await this.connect();
            
            // Update schema first
            await this.updateTableSchema();
            
            // Create indexes
            await this.createIndexes();
            
            // Analyze tables
            await this.analyzeTables();
            
            // Optimize tables
            await this.optimizeTables();
            
            // Create dashboard views
            await this.createDashboardView();
            
            console.log(chalk.green('\n✅ Database optimization completed successfully!'));
            
        } catch (error) {
            console.log(chalk.red(`❌ Database optimization failed: ${error.message}`));
        } finally {
            await this.disconnect();
        }
    }
}

// Run optimization if called directly
if (require.main === module) {
    const optimizer = new DatabaseOptimizer();
    optimizer.runOptimization();
}

module.exports = DatabaseOptimizer;
