-- Database Index Optimization Script for Milk Delivery App
-- This script creates optimized indexes for maximum performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);
CREATE INDEX IF NOT EXISTS idx_users_phone_active ON users(phone, is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(is_active, role);

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_status ON subscriptions(product_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_delivery ON subscriptions(next_delivery_date, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_end_date ON subscriptions(start_date, end_date);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active);
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_quantity, is_active);

-- Addresses table indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_primary ON addresses(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_addresses_user_active ON addresses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON addresses(latitude, longitude);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_subscription_status ON payments(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status_date ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(order_date, status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date, status);
CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_quantity ON order_items(quantity);

-- Delivery schedules table indexes
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_subscription_date ON delivery_schedules(subscription_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_status_date ON delivery_schedules(status, delivery_date);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- OTP verification table indexes
CREATE INDEX IF NOT EXISTS idx_otp_verification_email_code ON otp_verification(email, verification_code);
CREATE INDEX IF NOT EXISTS idx_otp_verification_expires ON otp_verification(expires_at);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_product_status ON subscriptions(user_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_date_status ON orders(user_id, order_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_status_date ON payments(subscription_id, status, created_at);

-- Full-text search indexes
ALTER TABLE products ADD FULLTEXT IF NOT EXISTS ft_products_name_description (name, description);
ALTER TABLE users ADD FULLTEXT IF NOT EXISTS ft_users_name_email (name, email);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_performance_queries_timestamp ON performance_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_queries_duration ON performance_queries(duration);

-- Show index statistics
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    CARDINALITY,
    SUB_PART,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME;

-- Show table sizes after optimization
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size_MB',
    ROUND((INDEX_LENGTH / 1024 / 1024), 2) AS 'Index_Size_MB',
    ROUND((INDEX_LENGTH / (DATA_LENGTH + INDEX_LENGTH)) * 100, 2) AS 'Index_Ratio_%'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
