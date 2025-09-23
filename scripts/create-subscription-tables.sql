-- Create delivery_zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zoneName VARCHAR(255) NOT NULL,
    postalCodes JSON NOT NULL,
    deliveryDays JSON NOT NULL,
    deliveryTimeSlots JSON NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    coordinates JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    milkType VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    frequency ENUM('daily', 'weekly', 'monthly') NOT NULL,
    deliveryAddress TEXT NOT NULL,
    deliveryZoneId INT NOT NULL,
    preferredDeliveryTime VARCHAR(50),
    startDate DATE NOT NULL,
    nextDeliveryDate DATE NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL,
    status ENUM('active', 'paused', 'cancelled', 'expired') DEFAULT 'active',
    paymentStatus ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deliveryZoneId) REFERENCES delivery_zones(id) ON DELETE RESTRICT
);

-- Create subscription_history table for tracking changes
CREATE TABLE IF NOT EXISTS subscription_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscriptionId INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    oldValue JSON,
    newValue JSON,
    changedBy INT,
    changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (changedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_userId ON subscriptions(userId);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_nextDeliveryDate ON subscriptions(nextDeliveryDate);
CREATE INDEX idx_subscriptions_deliveryZoneId ON subscriptions(deliveryZoneId);
CREATE INDEX idx_delivery_zones_isActive ON delivery_zones(isActive);

-- Insert sample delivery zones
INSERT INTO delivery_zones (zoneName, postalCodes, deliveryDays, deliveryTimeSlots) VALUES
('Central Mumbai', '["400001", "400002", "400003", "400004", "400005"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]', '["6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM"]'),
('Western Mumbai', '["400006", "400007", "400008", "400009", "400010"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '["6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM", "10:00 AM - 12:00 PM"]'),
('Eastern Mumbai', '["400011", "400012", "400013", "400014", "400015"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '["6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM"]'),
('South Mumbai', '["400016", "400017", "400018", "400019", "400020"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]', '["5:00 AM - 7:00 AM", "7:00 AM - 9:00 AM", "9:00 AM - 11:00 AM"]'),
('North Mumbai', '["400021", "400022", "400023", "400024", "400025"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '["6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM"]');

-- Insert sample subscriptions
INSERT INTO subscriptions (userId, milkType, quantity, frequency, deliveryAddress, deliveryZoneId, preferredDeliveryTime, startDate, nextDeliveryDate, totalAmount, status, paymentStatus) VALUES
(1, 'Whole Milk', 2, 'daily', '123 Main Street, Central Mumbai', 1, '6:00 AM - 8:00 AM', '2024-01-01', '2024-01-15', 1200.00, 'active', 'paid'),
(2, 'Skim Milk', 1, 'weekly', '456 Oak Avenue, Western Mumbai', 2, '8:00 AM - 10:00 AM', '2024-01-01', '2024-01-15', 800.00, 'active', 'paid'),
(3, 'Toned Milk', 3, 'daily', '789 Pine Road, Eastern Mumbai', 3, '6:00 AM - 8:00 AM', '2024-01-01', '2024-01-15', 1800.00, 'paused', 'paid'),
(4, 'Whole Milk', 1, 'monthly', '321 Elm Street, South Mumbai', 4, '7:00 AM - 9:00 AM', '2024-01-01', '2024-02-01', 1500.00, 'active', 'paid'),
(5, 'Skim Milk', 2, 'weekly', '654 Maple Drive, North Mumbai', 5, '8:00 AM - 10:00 AM', '2024-01-01', '2024-01-15', 1000.00, 'cancelled', 'failed');
