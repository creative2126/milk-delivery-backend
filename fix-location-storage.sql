-- Fix location storage in database - Complete schema update
USE milk_delivery;

-- First, let's see current subscriptions table structure
SHOW CREATE TABLE subscriptions;

-- Fix subscriptions table to properly store location details
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS building_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS flat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create subscription_errors table for debugging
CREATE TABLE IF NOT EXISTS subscription_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    error_message TEXT,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure users table has location fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS building_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS flat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing subscriptions to use proper user_id reference
-- This assumes subscriptions should reference users by id, not username
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS user_id INT,
ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_username ON subscriptions(username);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Insert sample data for testing
INSERT IGNORE INTO users (username, password, name, email, phone) 
VALUES 
('testuser1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User 1', 'test1@example.com', '1234567890'),
('testuser2', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User 2', 'test2@example.com', '1234567891');

-- Verify the schema
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'milk_delivery' 
    AND TABLE_NAME IN ('users', 'subscriptions')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
