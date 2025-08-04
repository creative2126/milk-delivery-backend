-- Update subscriptions table to include latitude and longitude
ALTER TABLE subscriptions 
ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER flat_number,
ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude;

-- Add index for location queries
CREATE INDEX idx_location ON subscriptions(latitude, longitude);

-- Add error logging table
CREATE TABLE IF NOT EXISTS subscription_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    error_message TEXT,
    error_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add payment status tracking
ALTER TABLE subscriptions 
ADD COLUMN payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending' AFTER status,
ADD COLUMN error_message TEXT NULL AFTER payment_status;
