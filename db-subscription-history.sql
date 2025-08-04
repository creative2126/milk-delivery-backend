-- Create subscription status history table to track pause/resume events
CREATE TABLE IF NOT EXISTS subscription_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    old_status ENUM('active', 'inactive', 'cancelled') NOT NULL,
    new_status ENUM('active', 'inactive', 'cancelled') NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    change_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Add indexes for faster queries
CREATE INDEX idx_subscription_history ON subscription_status_history(subscription_id);
CREATE INDEX idx_status_changes ON subscription_status_history(old_status, new_status);
CREATE INDEX idx_change_date ON subscription_status_history(created_at);

-- Add paused_at and resumed_at columns to subscriptions for quick reference
ALTER TABLE subscriptions 
ADD COLUMN paused_at TIMESTAMP NULL AFTER status,
ADD COLUMN resumed_at TIMESTAMP NULL AFTER paused_at,
ADD COLUMN total_paused_days INT DEFAULT 0 AFTER resumed_at;

-- Add trigger to automatically update paused_at and resumed_at
DELIMITER $$
CREATE TRIGGER update_subscription_timestamps
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
            SET NEW.paused_at = CURRENT_TIMESTAMP;
        ELSEIF NEW.status = 'active' AND OLD.status = 'inactive' THEN
            SET NEW.resumed_at = CURRENT_TIMESTAMP;
            -- Calculate total paused days
            IF NEW.paused_at IS NOT NULL THEN
                SET NEW.total_paused_days = NEW.total_paused_days + TIMESTAMPDIFF(DAY, NEW.paused_at, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;
