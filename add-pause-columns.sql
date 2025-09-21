-- Add missing pause/resume columns to users table
USE milk;

-- Add paused_at column to track when subscription was paused
ALTER TABLE users ADD COLUMN paused_at TIMESTAMP NULL DEFAULT NULL;

-- Add resumed_at column to track when subscription was resumed
ALTER TABLE users ADD COLUMN resumed_at TIMESTAMP NULL DEFAULT NULL;

-- Add total_paused_days column to track total days subscription was paused
ALTER TABLE users ADD COLUMN total_paused_days INT DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX idx_users_paused_at ON users(paused_at);
CREATE INDEX idx_users_resumed_at ON users(resumed_at);
CREATE INDEX idx_users_total_paused_days ON users(total_paused_days);

-- Display success message
SELECT '✅ Pause/resume columns added successfully to users table' as status;
