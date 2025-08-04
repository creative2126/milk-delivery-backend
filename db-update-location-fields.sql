-- Ensure the subscriptions table has all required location fields
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8) NULL AFTER flat_number,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8) NULL AFTER latitude;

-- Ensure users table exists with proper structure
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create error logging table for debugging
CREATE TABLE IF NOT EXISTS subscription_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    error_message TEXT,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO users (username, password, name, email, phone) 
VALUES ('testuser', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 'test@example.com', '1234567890')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
