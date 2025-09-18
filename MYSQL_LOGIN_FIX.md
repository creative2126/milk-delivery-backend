# MySQL Login Error Fix Guide

## Problem Analysis
The error `Access denied for user 'root'@'localhost' (using password: YES)` indicates MySQL is rejecting the connection with the current credentials.

## Current Configuration
From `backend/db.js`:
- **Username**: root
- **Password**: sushanth2126
- **Host**: 127.0.0.1
- **Database**: milk_delivery

## Quick Fix Steps

### 1. Check MySQL Service Status
```bash
# Windows
net start mysql
# or
sc query mysql

# Check if MySQL is running on port 3306
netstat -an | findstr 3306
```

### 2. Test Current Configuration
I've created `test-mysql-connection.js` to test your current setup. Run it with:
```bash
node test-mysql-connection.js
```

### 3. Common Solutions

#### Option A: Reset Root Password
```bash
# Stop MySQL service
net stop mysql

# Start MySQL in safe mode
mysqld --skip-grant-tables

# In another terminal, connect without password
mysql -u root

# Reset password
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'sushanth2126';
```

#### Option B: Create New Application User (Recommended)
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create dedicated application user
CREATE USER 'milk_app'@'localhost' IDENTIFIED BY 'secure_password123';
GRANT ALL PRIVILEGES ON milk_delivery.* TO 'milk_app'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Update Environment Configuration

Create or update `.env` file:
```
DB_HOST=127.0.0.1
DB_USER=milk_app
DB_PASS=secure_password123
DB_NAME=milk_delivery
DB_PORT=3306
```

### 5. Update Database Configuration

Update `backend/db.js` to use environment variables properly:
```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'milk_app',
  password: process.env.DB_PASS || 'secure_password123',
  database: process.env.DB_NAME || 'milk_delivery',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

## Troubleshooting Commands

### Check MySQL Users
```sql
SELECT User, Host FROM mysql.user;
```

### Check User Privileges
```sql
SHOW GRANTS FOR 'root'@'localhost';
```

### Test Connection
```bash
mysql -u root -p
mysql -u milk_app -p
```

## Windows-Specific Commands

### Start/Stop MySQL Service
```bash
net start mysql80
net stop mysql80
```

### Check MySQL Configuration
```bash
mysql --help
```

### Check Port Usage
```bash
netstat -ano | findstr 3306
```

## Verification Steps

1. **Test Connection**: Run `node test-mysql-connection.js`
2. **Check Tables**: Verify milk_delivery database exists
3. **Test API**: Test login endpoint
4. **Check Logs**: Monitor application logs

## Emergency Fallback

If all else fails, reinstall MySQL:
1. Backup your data
2. Uninstall MySQL
3. Reinstall with new configuration
4. Restore data from backup

## Support Commands

### Check MySQL Version
```bash
mysql --version
```

### Check MySQL Configuration
```bash
mysqld --verbose --help
```

### Check Port Usage
```bash
netstat -ano | findstr 3306
```

## Next Steps
1. Run the test script to diagnose the issue
2. Follow the appropriate solution based on the error
3. Update your configuration files
4. Test the application thoroughly
