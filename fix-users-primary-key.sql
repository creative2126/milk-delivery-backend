-- Fix users table primary key and subscriptions foreign key relationship
USE milk;

-- Step 1: Add id column as primary key to users table
-- First, check if id column already exists
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'milk'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'id'
);

-- If id column doesn't exist, add it
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE users ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
    'SELECT "id column already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Update subscriptions.user_id to reference users.id
-- First, backup existing subscriptions data
CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM subscriptions;

-- Update subscriptions.user_id based on username/email match
UPDATE subscriptions s
JOIN users u ON (s.username = u.username OR s.username = u.email)
SET s.user_id = u.id
WHERE s.user_id IS NULL OR s.user_id = 0;

-- Step 3: Add foreign key constraint if it doesn't exist
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = 'milk'
    AND TABLE_NAME = 'subscriptions'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME = 'fk_subscriptions_user_id'
);

SET @fk_sql = IF(@fk_exists = 0,
    'ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id)',
    'SELECT "Foreign key already exists" as message'
);
PREPARE fk_stmt FROM @fk_sql;
EXECUTE fk_stmt;
DEALLOCATE PREPARE fk_stmt;

-- Step 4: Verify the fix
SELECT
    'Users table structure:' as info,
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'milk'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'id';

SELECT
    'Sample users with id:' as info,
    id,
    username,
    email
FROM users
LIMIT 5;

SELECT
    'Sample subscriptions with user_id:' as info,
    s.id,
    s.username,
    s.user_id,
    u.username as user_username,
    u.email as user_email
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
LIMIT 5;

-- Step 5: Show count of subscriptions linked to users
SELECT
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN s.user_id IS NOT NULL THEN 1 END) as linked_subscriptions,
    COUNT(CASE WHEN s.user_id IS NULL THEN 1 END) as unlinked_subscriptions
FROM subscriptions s;
