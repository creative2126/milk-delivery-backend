-- Fix database schema to store location and building details in users table
USE milk_delivery;

-- Add location fields to users table
ALTER TABLE users 
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8),
ADD COLUMN building_name VARCHAR(255),
ADD COLUMN flat_number VARCHAR(50);

-- Update subscriptions table to include delivery address
ALTER TABLE subscriptions ADD COLUMN delivery_address TEXT;

-- Create procedure to update user location after payment
DELIMITER $$
CREATE PROCEDURE UpdateUserLocation(
    IN p_username VARCHAR(255),
    IN p_address TEXT,
    IN p_building_name VARCHAR(255),
    IN p_flat_number VARCHAR(50),
    IN p_latitude DECIMAL(10,8),
    IN p_longitude DECIMAL(11,8)
)
BEGIN
    UPDATE users 
    SET 
        street = p_address,
        building_name = p_building_name,
        flat_number = p_flat_number,
        latitude = p_latitude,
        longitude = p_longitude,
        updated_at = NOW()
    WHERE username = p_username;
END$$
DELIMITER ;

-- Insert test user
INSERT IGNORE INTO users (username, password, name, email, phone) 
VALUES ('testuser', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 'test@example.com', '1234567890');
