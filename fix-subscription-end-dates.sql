-- Fix subscription end dates that are showing as 01/01/1970 (Unix epoch)
USE milk;

-- First, let's check what subscriptions have incorrect end dates
SELECT
    s.id,
    s.username,
    s.subscription_type,
    s.duration,
    s.created_at,
    s.start_date,
    s.end_date,
    s.status,
    DATEDIFF(s.end_date, CURDATE()) as current_remaining_days
FROM subscriptions s
WHERE s.end_date = '1970-01-01'
   OR s.end_date IS NULL
   OR s.end_date < '2020-01-01';

-- Fix subscriptions with null or 1970-01-01 end dates
UPDATE subscriptions
SET end_date = CASE
    WHEN duration = '6days' THEN DATE_ADD(COALESCE(start_date, created_at), INTERVAL 7 DAY)
    WHEN duration = '15days' THEN DATE_ADD(COALESCE(start_date, created_at), INTERVAL 17 DAY)
    ELSE DATE_ADD(COALESCE(start_date, created_at), INTERVAL 7 DAY)
END
WHERE end_date = '1970-01-01'
   OR end_date IS NULL
   OR end_date < '2020-01-01';

-- Update status for expired subscriptions
UPDATE subscriptions
SET status = 'expired'
WHERE end_date < CURDATE()
  AND status = 'active';

-- Verify the fixes
SELECT
    s.id,
    s.username,
    s.subscription_type,
    s.duration,
    s.created_at,
    s.start_date,
    s.end_date,
    s.status,
    GREATEST(DATEDIFF(s.end_date, CURDATE()), 0) as corrected_remaining_days
FROM subscriptions s
WHERE s.end_date >= '2020-01-01'
ORDER BY s.created_at DESC
LIMIT 10;
