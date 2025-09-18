-- Fix subscriptions table schema
USE milk;

-- Add missing columns one by one (safer approach)
ALTER TABLE subscriptions ADD COLUMN username VARCHAR(50) NOT NULL DEFAULT 'guest';
ALTER TABLE subscriptions ADD COLUMN subscription_type VARCHAR(20) NOT NULL DEFAULT '500ml';
ALTER TABLE subscriptions ADD COLUMN duration VARCHAR(50) NOT NULL DEFAULT '6days';
ALTER TABLE subscriptions ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE subscriptions ADD COLUMN address TEXT;
ALTER TABLE subscriptions ADD COLUMN building_name VARCHAR(100);
ALTER TABLE subscriptions ADD COLUMN flat_number VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN payment_id VARCHAR(100);
ALTER TABLE subscriptions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Show the updated schema
DESCRIBE subscriptions;
