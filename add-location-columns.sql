-- Migration script to add latitude and longitude columns to subscriptions table
-- This fixes the "Unknown column 'latitude' in 'field list'" error

USE milk_delivery;

-- Add latitude and longitude columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER flat_number;

ALTER TABLE subscriptions 
ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude;

-- Add index for location queries
CREATE INDEX idx_location ON subscriptions(latitude, longitude);

-- Verify the changes
DESCRIBE subscriptions;
