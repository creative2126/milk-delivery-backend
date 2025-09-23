const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'milk_delivery',
    multipleStatements: true
};

async function runMigration() {
    let connection;
    
    try {
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'create-subscription-tables.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database');
        
        // Start transaction
        await connection.beginTransaction();
        console.log('Started transaction');
        
        // Split SQL into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                await connection.execute(statement);
            }
        }
        
        // Commit transaction
        await connection.commit();
        console.log('Migration completed successfully!');
        
        // Verify tables were created
        const [tables] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ? 
            AND table_name IN ('delivery_zones', 'subscriptions', 'subscription_history')
        `, [dbConfig.database]);
        
        console.log('Created tables:', tables.map(t => t.table_name));
        
    } catch (error) {
        console.error('Migration failed:', error);
        if (connection) {
            await connection.rollback();
            console.log('Transaction rolled back');
        }
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };
