-- Migration script to merge subscriptions table into users table
-- This script will add subscription columns to users table and migrate data

USE milk_delivery;

-- Step 1: Add subscription-related columns to users table
ALTER TABLE users
ADD COLUMN subscription_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN subscription_duration VARCHAR(50) DEFAULT NULL,
ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN subscription_address TEXT DEFAULT NULL,
ADD COLUMN subscription_building_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN subscription_flat_number VARCHAR(50) DEFAULT NULL,
ADD COLUMN subscription_payment_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN subscription_status ENUM('active', 'inactive', 'cancelled', 'paused', 'expired') DEFAULT NULL,
ADD COLUMN subscription_start_date DATE DEFAULT NULL,
ADD COLUMN subscription_end_date DATE DEFAULT NULL,
ADD COLUMN subscription_created_at TIMESTAMP DEFAULT NULL,
ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NULL;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_type ON users(subscription_type);

-- Step 3: Migrate data from subscriptions to users table
-- Update users table with subscription data where username matches
UPDATE users u
JOIN subscriptions s ON u.username = s.username
SET
    u.subscription_type = s.subscription_type,
    u.subscription_duration = s.duration,
    u.subscription_amount = s.amount,
    u.subscription_address = s.address,
    u.subscription_building_name = s.building_name,
    u.subscription_flat_number = s.flat_number,
    u.subscription_payment_id = s.payment_id,
    u.subscription_status = s.status,
    u.subscription_created_at = s.created_at,
    u.subscription_updated_at = s.updated_at;

-- Step 4: Handle users without subscriptions (set default values)
UPDATE users
SET subscription_status = 'inactive'
WHERE subscription_status IS NULL;

-- Step 5: Show results for verification
SELECT
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM users WHERE subscription_status IS NOT NULL) as users_with_subscriptions,
    (SELECT COUNT(*) FROM users WHERE subscription_status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM subscriptions) as remaining_subscriptions;

-- Note: The subscriptions table will be dropped in the Node.js migration script
-- after verifying the data migration is successful
