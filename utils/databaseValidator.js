// utils/databaseValidator.js
const { pool } = require('../db');

class DatabaseValidator {
  static requiredTables = [
    'users'
  ];

  static requiredColumns = {
    users: [
      'id', 'username', 'email', 'password', 'name', 'phone',
      'street', 'city', 'state', 'zip', 'latitude', 'longitude',
      'subscription_type', 'subscription_duration', 'subscription_status',
      'subscription_start_date', 'subscription_end_date', 'subscription_address',
      'subscription_building_name', 'subscription_flat_number', 'subscription_amount',
      'subscription_payment_id', 'subscription_created_at', 'subscription_updated_at',
      'paused_at', 'resumed_at', 'total_paused_days',
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

      // Get existing columns first
      const [userCols] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
      );
      const existingUserCols = userCols.map(c => c.COLUMN_NAME);

      // Add all required user columns if missing
      const userColumnsToAdd = [
        { name: 'street', def: 'VARCHAR(255)' },
        { name: 'city', def: 'VARCHAR(100)' },
        { name: 'state', def: 'VARCHAR(100)' },
        { name: 'zip', def: 'VARCHAR(20)' },
        { name: 'latitude', def: 'DECIMAL(10, 8)' },
        { name: 'longitude', def: 'DECIMAL(11, 8)' },
        { name: 'subscription_type', def: 'VARCHAR(50)' },
        { name: 'subscription_duration', def: 'VARCHAR(20)' },
        { name: 'subscription_status', def: "ENUM('active', 'paused', 'cancelled', 'expired') DEFAULT 'active'" },
        { name: 'subscription_start_date', def: 'DATE' },
        { name: 'subscription_end_date', def: 'DATE' },
        { name: 'subscription_address', def: 'VARCHAR(255)' },
        { name: 'subscription_building_name', def: 'VARCHAR(100)' },
        { name: 'subscription_flat_number', def: 'VARCHAR(20)' },
        { name: 'subscription_amount', def: 'DECIMAL(10, 2)' },
        { name: 'subscription_payment_id', def: 'VARCHAR(100)' },
        { name: 'subscription_created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'subscription_updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        { name: 'paused_at', def: 'TIMESTAMP NULL' },
        { name: 'resumed_at', def: 'TIMESTAMP NULL' },
        { name: 'total_paused_days', def: 'INT DEFAULT 0' }
      ];

      for (const col of userColumnsToAdd) {
        if (!existingUserCols.includes(col.name)) {
          await connection.execute(
            `ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`
          );
          console.log(`✅ Added missing column '${col.name}' to users`);
        }
      }

      // Drop subscriptions table if it exists (since we're using merged schema)
      await connection.execute(`DROP TABLE IF EXISTS subscriptions`);
      console.log('✅ Dropped legacy subscriptions table');

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
