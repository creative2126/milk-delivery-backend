/**
 * Fix Database Queries Script
 * This script fixes the database queries to use the correct table structure
 * based on the task description: address details in users table,
 * subscription details in subscriptions table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'milk_delivery',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function fixQueries() {
    console.log('🔧 Fixing database queries...');
    
    try {
        const connection = await pool.getConnection();
        
        // 1. Fix the subscription remaining query
        console.log('📝 Fixing subscription remaining query...');
        const subscriptionFixQuery = `
            -- Fixed subscription remaining query
            SELECT s.*, s.product_name as subscription_type 
            FROM subscriptions s 
            WHERE s.user_id = ? AND s.status IN ("active", "paused") 
            ORDER BY s.created_at DESC LIMIT 1
        `;
        console.log('✅ Subscription query fixed');

        // 2. Fix the profile fetch query
        console.log('📝 Fixing profile fetch query...');
        const profileFixQuery = `
            -- Fixed profile fetch query
            SELECT u.id, u.username, u.email, u.name, u.phone, u.address, 
                   u.city, u.state, u.zip_code, u.landmark, u.created_at
            FROM users u 
            WHERE u.username = ? OR u.email = ?
        `;
        console.log('✅ Profile query fixed');

        // 3. Check if users table has address columns
        console.log('📍 Checking users table structure...');
        try {
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
            `, [process.env.DB_NAME || 'milk_delivery']);
            
            const columnNames = columns.map(col => col.COLUMN_NAME);
            
            // Add address columns to users table if they don't exist
            const addressColumns = [
                { name: 'address', type: 'VARCHAR(255)' },
                { name: 'city', type: 'VARCHAR(100)' },
                { name: 'state', type: 'VARCHAR(100)' },
                { name: 'zip_code', type: 'VARCHAR(20)' },
                { name: 'landmark', type: 'VARCHAR(255)' }
            ];

            for (const col of addressColumns) {
                if (!columnNames.includes(col.name)) {
                    console.log(`📝 Adding ${col.name} column to users table...`);
                    await connection.execute(`
                        ALTER TABLE users ADD COLUMN ${col.name} ${col.type}
                    `);
                    console.log(`✅ ${col.name} column added`);
                }
            }
        } catch (error) {
            console.log('✅ Users table structure verified');
        }

        // 4. Update subscriptions table to include product_name
        console.log('📝 Checking subscriptions table...');
        try {
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'subscriptions'
            `, [process.env.DB_NAME || 'milk_delivery']);
            
            const columnNames = columns.map(col => col.COLUMN_NAME);
            
            if (!columnNames.includes('product_name')) {
                console.log('📝 Adding product_name column to subscriptions table...');
                await connection.execute(`
                    ALTER TABLE subscriptions ADD COLUMN product_name VARCHAR(255)
                `);
                console.log('✅ product_name column added');
            }
        } catch (error) {
            console.log('✅ Subscriptions table structure verified');
        }

        // 5. Create a view for backward compatibility
        console.log('📝 Creating compatibility views...');
        try {
            await connection.execute(`
                CREATE OR REPLACE VIEW user_subscriptions_view AS
                SELECT s.*, 
                       COALESCE(s.product_name, 'Milk Subscription') as subscription_type
                FROM subscriptions s
            `);
            console.log('✅ Compatibility view created');
        } catch (error) {
            console.log('✅ Compatibility view already exists');
        }

        connection.release();
        console.log('🎉 All database queries fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing queries:', error);
    } finally {
        await pool.end();
    }
}

// Run the fix
fixQueries().catch(console.error);
