-- Add missing columns to subscriptions table
USE milk;

-- Add username column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS username VARCHAR(50) NOT NULL DEFAULT 'guest';

-- Add subscription_type column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) NOT NULL DEFAULT '500ml';

-- Add duration column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS duration VARCHAR(20) NOT NULL DEFAULT '6days';

-- Add amount column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add address column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add building_name column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS building_name VARCHAR(100);

-- Add flat_number column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS flat_number VARCHAR(20);

-- Add payment_id column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);

-- Add status column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Add created_at column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Show the updated schema
DESCRIBE subscriptions;
