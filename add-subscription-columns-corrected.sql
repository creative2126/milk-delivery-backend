-- Add subscription columns to users table one by one

USE milk;

-- Add subscription_type column
ALTER TABLE users ADD COLUMN subscription_type VARCHAR(50) DEFAULT NULL;

-- Add subscription_duration column
ALTER TABLE users ADD COLUMN subscription_duration VARCHAR(50) DEFAULT NULL;

-- Add subscription_amount column
ALTER TABLE users ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT NULL;

-- Add subscription_address column
ALTER TABLE users ADD COLUMN subscription_address TEXT DEFAULT NULL;

-- Add subscription_building_name column
ALTER TABLE users ADD COLUMN subscription_building_name VARCHAR(255) DEFAULT NULL;

-- Add subscription_flat_number column
ALTER TABLE users ADD COLUMN subscription_flat_number VARCHAR(50) DEFAULT NULL;

-- Add subscription_payment_id column
ALTER TABLE users ADD COLUMN subscription_payment_id VARCHAR(255) DEFAULT NULL;

-- Add subscription_status column
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT NULL;

-- Add subscription_start_date column
ALTER TABLE users ADD COLUMN subscription_start_date DATE DEFAULT NULL;

-- Add subscription_end_date column
ALTER TABLE users ADD COLUMN subscription_end_date DATE DEFAULT NULL;

-- Add subscription_created_at column
ALTER TABLE users ADD COLUMN subscription_created_at TIMESTAMP DEFAULT NULL;

-- Add subscription_updated_at column
ALTER TABLE users ADD COLUMN subscription_updated_at TIMESTAMP DEFAULT NULL;
