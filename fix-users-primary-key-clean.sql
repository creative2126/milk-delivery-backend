USE milk;
ALTER TABLE users ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;
UPDATE subscriptions s JOIN users u ON (s.username = u.username OR s.username = u.email) SET s.user_id = u.id WHERE s.user_id IS NULL OR s.user_id = 0;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id);
DESCRIBE users;
SELECT id, username, email FROM users LIMIT 5;
SELECT s.id, s.username, s.user_id, u.username as user_username FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id LIMIT 5;
SELECT COUNT(*) as total_subscriptions, COUNT(CASE WHEN s.user_id IS NOT NULL THEN 1 END) as linked_subscriptions, COUNT(CASE WHEN s.user_id IS NULL THEN 1 END) as unlinked_subscriptions FROM subscriptions s;
