-- Fix subscription end dates in users table that are showing as 01/01/1970 (Unix epoch) or NULL
USE milk;

-- First, let's check what subscriptions have incorrect end dates
SELECT
    u.id,
    u.username,
    u.subscription_type,
    u.subscription_duration,
    u.subscription_created_at,
    u.subscription_start_date,
    u.subscription_end_date,
    u.subscription_status,
    DATEDIFF(u.subscription_end_date, CURDATE()) as current_remaining_days
FROM users u
WHERE u.subscription_end_date = '1970-01-01'
   OR u.subscription_end_date IS NULL
   OR u.subscription_end_date < '2020-01-01'
   OR u.subscription_status IS NOT NULL;

-- Fix subscriptions with null or 1970-01-01 end dates in users table
UPDATE users
SET subscription_end_date = CASE
    WHEN subscription_duration = '6days' THEN DATE_ADD(COALESCE(subscription_start_date, subscription_created_at), INTERVAL 7 DAY)
    WHEN subscription_duration = '15days' THEN DATE_ADD(COALESCE(subscription_start_date, subscription_created_at), INTERVAL 17 DAY)
    ELSE DATE_ADD(COALESCE(subscription_start_date, subscription_created_at), INTERVAL 7 DAY)
END
WHERE subscription_end_date = '1970-01-01'
   OR subscription_end_date IS NULL
   OR subscription_end_date < '2020-01-01';

-- Update status for expired subscriptions
UPDATE users
SET subscription_status = 'expired'
WHERE subscription_end_date < CURDATE()
  AND subscription_status = 'active';

-- Verify the fixes
SELECT
    u.id,
    u.username,
    u.subscription_type,
    u.subscription_duration,
    u.subscription_created_at,
    u.subscription_start_date,
    u.subscription_end_date,
    u.subscription_status,
    GREATEST(DATEDIFF(u.subscription_end_date, CURDATE()), 0) as corrected_remaining_days
FROM users u
WHERE u.subscription_end_date >= '2020-01-01'
  AND u.subscription_status IS NOT NULL
ORDER BY u.subscription_created_at DESC
LIMIT 10;
