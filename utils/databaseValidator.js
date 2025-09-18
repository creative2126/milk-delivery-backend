// utils/databaseValidator.js
const { pool } = require('../db');

class DatabaseValidator {
  static requiredTables = [
    'users', 'products', 'subscriptions', 'cart', 'addresses',
    'deliveries', 'orders', 'notifications'
  ];

  static requiredColumns = {
    users: [
      'id', 'username', 'email', 'password', 'name', 'phone',
      'address', 'city', 'state', 'zip_code', 'landmark',
      'created_at', 'updated_at'
    ],
    subscriptions: [
      'id', 'user_id', 'product_name', 'quantity', 'price',
      'frequency', 'start_date', 'end_date', 'status',
      'created_at', 'updated_at'
    ],
    products: [
      'id', 'name', 'description', 'price', 'category',
      'image_url', 'stock_quantity', 'is_active',
      'created_at', 'updated_at'
    ]
  };

  // ✅ Schema validation
  static async validateSchema() {
    let connection;
    try {
      connection = await pool.getConnection();

      // Check existing tables
      const [tables] = await connection.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE()`
      );

      const existingTables = tables.map(t => t.TABLE_NAME);
      const missingTables = this.requiredTables.filter(
        table => !existingTables.includes(table)
      );

      if (missingTables.length > 0) {
        console.error('❌ Missing tables:', missingTables);
        return { valid: false, missingTables };
      }

      // Check required columns
      for (const [tableName, columns] of Object.entries(this.requiredColumns)) {
        const [tableColumns] = await connection.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tableName]
        );

        const existingColumns = tableColumns.map(c => c.COLUMN_NAME);
        const missingColumns = columns.filter(
          col => !existingColumns.includes(col)
        );

        if (missingColumns.length > 0) {
          console.error(`❌ Missing columns in ${tableName}:`, missingColumns);
          return {
            valid: false,
            missingColumns: { table: tableName, columns: missingColumns }
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('❌ Database validation error:', error.message);
      return { valid: false, error: error.message };
    } finally {
      if (connection) connection.release();
    }
  }

  // ✅ Auto-create tables & add missing columns
  static async createMissingTables() {
    let connection;
    try {
      connection = await pool.getConnection();

      // Create users table if missing
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(100),
          phone VARCHAR(20),
          address VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(100),
          zip_code VARCHAR(20),
          landmark VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create subscriptions table if missing
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          price DECIMAL(10,2) NOT NULL,
          frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
          start_date DATE NOT NULL,
          end_date DATE,
          status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // ✅ Ensure missing columns in users table
      const [userCols] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
      );
      const existingUserCols = userCols.map(c => c.COLUMN_NAME);

      const addUserCols = [
        { name: 'address', def: 'VARCHAR(255)' },
        { name: 'city', def: 'VARCHAR(100)' },
        { name: 'state', def: 'VARCHAR(100)' },
        { name: 'zip_code', def: 'VARCHAR(20)' },
        { name: 'landmark', def: 'VARCHAR(255)' }
      ];

      for (const col of addUserCols) {
        if (!existingUserCols.includes(col.name)) {
          await connection.execute(
            `ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`
          );
          console.log(`✅ Added missing column '${col.name}' to users`);
        }
      }

      // ✅ Ensure missing product_name in subscriptions
      const [subCols] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'`
      );
      const existingSubCols = subCols.map(c => c.COLUMN_NAME);

      if (!existingSubCols.includes('product_name')) {
        await connection.execute(
          `ALTER TABLE subscriptions ADD COLUMN product_name VARCHAR(255)`
        );
        console.log(`✅ Added missing column 'product_name' to subscriptions`);
      }

      console.log('✅ Database schema validated and updated successfully');
    } catch (error) {
      console.error('❌ Error creating missing tables/columns:', error.message);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = DatabaseValidator;
