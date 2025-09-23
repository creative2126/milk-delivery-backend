-- Manual Migration Schema for Users and Subscriptions

-- Users table (existing)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  -- Subscription related columns to be added
  subscription_type VARCHAR(50) DEFAULT NULL,
  subscription_duration VARCHAR(50) DEFAULT NULL,
  subscription_amount DECIMAL(10,2) DEFAULT NULL,
  subscription_address TEXT DEFAULT NULL,
  subscription_building_name VARCHAR(255) DEFAULT NULL,
  subscription_flat_number VARCHAR(50) DEFAULT NULL,
  subscription_payment_id VARCHAR(255) DEFAULT NULL,
  subscription_status ENUM('active', 'inactive', 'cancelled', 'paused', 'expired') DEFAULT NULL,
  subscription_start_date DATE DEFAULT NULL,
  subscription_end_date DATE DEFAULT NULL,
  subscription_created_at TIMESTAMP NULL DEFAULT NULL,
  subscription_updated_at TIMESTAMP NULL DEFAULT NULL,
  -- Location columns
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  building_name VARCHAR(255) DEFAULT NULL,
  flat_number VARCHAR(50) DEFAULT NULL
);

-- Subscriptions table (to be dropped after migration)
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(255) NOT NULL,
  subscription_type VARCHAR(20) NOT NULL DEFAULT '500ml',
  duration VARCHAR(50) NOT NULL DEFAULT '6days',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  address TEXT,
  building_name VARCHAR(100),
  flat_number VARCHAR(20),
  payment_id VARCHAR(100),
  status ENUM('active', 'inactive', 'cancelled', 'expired') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  delivery_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
-- Drop index if exists is not supported in MySQL, so use conditional drop workaround or skip drop
-- Assuming index does not exist or handle manually before running this script
-- Check if index exists before creating to avoid duplicate key error
-- This requires procedural code or manual check; here we skip creating idx_subscription_status, idx_subscription_type, idx_username, idx_status, and idx_created_at to avoid duplicate key error
-- CREATE INDEX idx_subscription_status ON users(subscription_status);
-- CREATE INDEX idx_subscription_type ON users(subscription_type);
-- CREATE INDEX idx_username ON subscriptions(username);
-- CREATE INDEX idx_status ON subscriptions(status);
-- CREATE INDEX idx_created_at ON subscriptions(created_at);

-- Subscription status history table
CREATE TABLE IF NOT EXISTS subscription_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  old_status ENUM('active', 'inactive', 'cancelled', 'paused', 'expired'),
  new_status ENUM('active', 'inactive', 'cancelled', 'paused', 'expired'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subscription_history (subscription_id),
  INDEX idx_status_changes (old_status, new_status),
  INDEX idx_change_date (created_at)
);

-- Additional columns for pause/resume tracking
ALTER TABLE subscriptions
  ADD COLUMN paused_at TIMESTAMP NULL,
  ADD COLUMN resumed_at TIMESTAMP NULL,
  ADD COLUMN total_paused_days INT DEFAULT 0;
