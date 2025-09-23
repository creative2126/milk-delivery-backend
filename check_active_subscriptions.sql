-- Replace 'username_here' with the actual username or email to check
SELECT s.id, s.subscription_type, s.status, s.created_at, s.end_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.username = 'username_here' AND s.status = 'active';
