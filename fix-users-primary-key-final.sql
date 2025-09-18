USE milk;

-- Check if id column exists and add it if not
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'milk' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE users ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST', 'SELECT "id column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update subscriptions.user_id based on username/email match
UPDATE subscriptions s
JOIN users u ON (s.username = u.username OR s.username = u.email)
SET s.user_id = u.id
WHERE s.user_id IS NULL OR s.user_id = 0;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = 'milk' AND TABLE_NAME = 'subscriptions' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_subscriptions_user_id');
SET @fk_sql = IF(@fk_exists = 0, 'ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id)', 'SELECT "Foreign key already exists"');
PREPARE fk_stmt FROM @fk_sql;
EXECUTE fk_stmt;
DEALLOCATE PREPARE fk_stmt;

-- Verify the fix
DESCRIBE users;
SELECT id, username, email FROM users LIMIT 5;
SELECT s.id, s.username, s.user_id, u.username as user_username FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id LIMIT 5;
SELECT COUNT(*) as total_subscriptions, COUNT(CASE WHEN s.user_id IS NOT NULL THEN 1 END) as linked_subscriptions, COUNT(CASE WHEN s.user_id IS NULL THEN 1 END) as unlinked_subscriptions FROM subscriptions s;
