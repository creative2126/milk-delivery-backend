-- Add missing subscription pause/resume columns to users table
-- These columns were present in the original subscriptions table but missing from users table

USE milk;

-- Add paused_at column to track when subscription was paused
ALTER TABLE users ADD COLUMN paused_at TIMESTAMP NULL DEFAULT NULL;

-- Add resumed_at column to track when subscription was resumed
ALTER TABLE users ADD COLUMN resumed_at TIMESTAMP NULL DEFAULT NULL;

-- Add total_paused_days column to track total days subscription was paused
ALTER TABLE users ADD COLUMN total_paused_days INT DEFAULT 0;

-- Show the updated schema
DESCRIBE users;

-- Add indexes for better performance on subscription pause/resume queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_paused ON users(paused_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_resumed ON users(resumed_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_paused_days ON users(total_paused_days);

-- Display success message
SELECT '✅ Missing subscription columns added successfully to users table' as status;
