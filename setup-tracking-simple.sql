-- Create subscription status history table
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

-- Add columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMP NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS total_paused_days INT DEFAULT 0;

-- Create indexes
CREATE INDEX idx_subscription_history ON subscription_status_history(subscription_id);
CREATE INDEX idx_status_changes ON subscription_status_history(old_status, new_status);
CREATE INDEX idx_change_date ON subscription_status_history(created_at);
