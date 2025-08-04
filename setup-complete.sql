-- Complete database setup script for milk delivery system
-- This script creates all necessary tables in the correct order

USE milk_delivery;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  street VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  zip VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  subscription_type VARCHAR(50) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  address TEXT NOT NULL,
  building_name VARCHAR(255) NOT NULL,
  flat_number VARCHAR(50) NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_username ON subscriptions(username);
CREATE INDEX idx_status ON subscriptions(status);
CREATE INDEX idx_created_at ON subscriptions(created_at);

-- Verify tables
SHOW TABLES;
