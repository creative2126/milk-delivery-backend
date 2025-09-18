# Registration Error Fix Guide

## Problem Summary
The registration error `ER_ACCESS_DENIED_ERROR (1045)` indicates MySQL access denied, which is caused by incorrect database credentials or missing database setup.

## Solution Steps

### 1. Install Required Dependencies
```bash
cd backend
npm install dotenv mysql2
```

### 2. Database Setup
```sql
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS milk_delivery;
USE milk_delivery;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    name VARCHAR(255),
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create otp_verification table
CREATE TABLE IF NOT EXISTS otp_verification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);
```

### 3. Update Database Configuration
The `.env` file has been created with default MySQL credentials. Update these values based on your MySQL setup:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=milk_delivery
```

### 4. Test Database Connection
Run this test script to verify the connection:

```bash
node -e "
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'milk_delivery'
});

connection.connect(err => {
  if (err) {
    console.error('❌ Connection failed:', err);
    return;
  }
  console.log('✅ Database connected successfully!');
  connection.end();
});
"
```

### 5. Fix Registration Endpoint
The registration endpoint should be updated to handle the database connection properly. The issue is likely in the server.js file where the registration route is defined.

### 6. Common Fixes
- **MySQL not running**: Start MySQL service
- **Wrong credentials**: Update .env file with correct credentials
- **Database not created**: Run the SQL script above
- **User permissions**: Grant proper permissions to MySQL user

### 7. Quick Test
After applying fixes, test registration with:
```bash
node test-registration-flow.js
```

## MySQL Setup Commands
```bash
# Start MySQL (Windows)
net start mysql

# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE milk_delivery;
GRANT ALL PRIVILEGES ON milk_delivery.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## Verification
After implementing these fixes, the registration should work without the access denied error.
