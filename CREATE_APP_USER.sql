-- Replace 'appuser' and 'app_password' with your desired username and password
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'app_password';

-- Grant all privileges on the milk_delivery database to the new user
GRANT ALL PRIVILEGES ON milk_delivery.* TO 'appuser'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;
