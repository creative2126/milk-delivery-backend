-- Add paused_at column to subscriptions table to track when subscription was paused
USE milk;

-- Add paused_at column to track when subscription was paused
ALTER TABLE subscriptions ADD COLUMN paused_at TIMESTAMP NULL DEFAULT NULL;

-- Show the updated schema
DESCRIBE subscriptions;
