const db = require('./db');

async function setupTracking() {
  try {
    console.log('Setting up subscription tracking...');
    
    // Create history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        old_status ENUM('active', 'inactive', 'cancelled') NOT NULL,
        new_status ENUM('active', 'inactive', 'cancelled') NOT NULL,
        changed_by VARCHAR(255) NOT NULL,
        change_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
      )
    `);
    
    // Add columns to subscriptions table
    try {
      await db.execute('ALTER TABLE subscriptions ADD COLUMN paused_at TIMESTAMP NULL');
    } catch (e) {
      console.log('paused_at column already exists or error:', e.message);
    }
    
    try {
      await db.execute('ALTER TABLE subscriptions ADD COLUMN resumed_at TIMESTAMP NULL');
    } catch (e) {
      console.log('resumed_at column already exists or error:', e.message);
    }
    
    try {
      await db.execute('ALTER TABLE subscriptions ADD COLUMN total_paused_days INT DEFAULT 0');
    } catch (e) {
      console.log('total_paused_days column already exists or error:', e.message);
    }
    
    console.log('✅ Subscription tracking setup completed successfully');
    
    // Verify tables
    const [tables] = await db.execute('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]));
    
  } catch (error) {
    console.error('❌ Error setting up tracking:', error);
  } finally {
    process.exit(0);
  }
}

setupTracking();
