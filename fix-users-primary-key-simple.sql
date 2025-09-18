-- Simple migration to fix users table primary key and subscriptions foreign key
USE milk;

-- Step 1: Add id column as primary key to users table if it doesn't exist
ALTER TABLE users ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- Step 2: Update subscriptions.user_id based on username/email match
UPDATE subscriptions s
JOIN users u ON (s.username = u.username OR s.username = u.email)
SET s.user_id = u.id
WHERE s.user_id IS NULL OR s.user_id = 0;

-- Step 3: Add foreign key constraint
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id);

-- Step 4: Verify the fix
SELECT 'Users table structure:' as info;
DESCRIBE users;

SELECT 'Sample users:' as info;
SELECT id, username, email FROM users LIMIT 5;

SELECT 'Sample subscriptions:' as info;
SELECT s.id, s.username, s.user_id, u.username as user_username
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
LIMIT 5;

SELECT 'Subscription linkage summary:' as info;
SELECT
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN s.user_id IS NOT NULL THEN 1 END) as linked_subscriptions,
    COUNT(CASE WHEN s.user_id IS NULL THEN 1 END) as unlinked_subscriptions
FROM subscriptions s;
