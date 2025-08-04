# Milk Delivery Backend - Render Deployment Guide

## Overview
This backend has been successfully prepared for deployment to Render with environment variables for secure database connection.

## ✅ Changes Made

### 1. Database Configuration Updated
- **File**: `backend/db.js`
- **Changes**: Replaced hardcoded database credentials with environment variables
- **Now uses**: `process.env.DB_HOST`, `process.env.DB_USER`, `process.env.DB_PASS`, `process.env.DB_NAME`

### 2. Environment Variables Documentation
- **File**: `backend/.env.example`
- **Purpose**: Template for environment variables configuration

## 🚀 Deployment Steps

### Step 1: Prepare Environment Variables
Create a `.env` file in your backend directory with your actual database credentials:

```bash
# Copy the template
cp .env.example .env

# Edit with your actual values
DB_HOST=your-database-host
DB_USER=your-database-username
DB_PASS=your-database-password
DB_NAME=your-database-name
DB_PORT=3306
```

### Step 2: Deploy to Render

#### Option A: Using Render Dashboard
1. **Create Web Service**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the backend folder

2. **Configure Environment**:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: Add the variables from your `.env` file

3. **Database Setup**:
   - Use PlanetScale, Railway, or Hostinger MySQL
   - Update the environment variables with your database credentials

#### Option B: Using Render Blueprint (render.yaml)
Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: milk-delivery-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: DB_HOST
        fromDatabase:
          name: milkdb
          property: host
      - key: DB_USER
        fromDatabase:
          name: milkdb
          property: user
      - key: DB_PASS
        fromDatabase:
          name: milkdb
          property: password
      - key: DB_NAME
        fromDatabase:
          name: milkdb
          property: database
      - key: DB_PORT
        fromDatabase:
          name: milkdb
          property: port
```

### Step 3: Database Migration (if needed)
If you're migrating from localhost to a cloud database:

1. **Export your local database**:
   ```bash
   mysqldump -u root -p milk_delivery > backup.sql
   ```

2. **Import to cloud database**:
   ```bash
   mysql -h your-cloud-host -u your-user -p your-database < backup.sql
   ```

### Step 4: Verify Deployment
After deployment, test your endpoints:

```bash
# Test database connection
curl https://your-app.onrender.com/api/health

# Test user registration
curl -X POST https://your-app.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123","email":"test@example.com"}'
```

## 🔧 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host | `aws.connect.psdb.cloud` |
| `DB_USER` | Database username | `your-username` |
| `DB_PASS` | Database password | `your-password` |
| `DB_NAME` | Database name | `milk_delivery` |
| `DB_PORT` | Database port | `3306` |
| `PORT` | Server port | `3001` |

## 🛠️ Common Database Providers

### PlanetScale (Recommended)
```bash
DB_HOST=aws.connect.psdb.cloud
DB_USER=your-ps-username
DB_PASS=your-ps-password
DB_NAME=your-ps-database
DB_SSL=true
```

### Hostinger MySQL
```bash
DB_HOST=your-hostinger-host
DB_USER=your-hostinger-username
DB_PASS=your-hostinger-password
DB_NAME=your-hostinger-database
```

### Railway MySQL
```bash
DB_HOST=containers-us-west-XX.railway.app
DB_USER=root
DB_PASS=your-railway-password
DB_NAME=railway
DB_PORT=your-railway-port
```

## 🚨 Security Notes
- Never commit your `.env` file to version control
- Use strong passwords for database connections
- Enable SSL connections when available
- Regularly rotate database credentials

## 📞 Support
If you encounter issues during deployment:
1. Check Render logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure your database is accessible from Render's IP ranges
4. Test database connection locally first with the same credentials

## ✅ Deployment Complete!
Your backend is now ready for Render deployment with secure environment variable configuration. The hardcoded database credentials have been replaced with environment variables, making it production-ready.

Next steps:
1. Set up your environment variables in Render
2. Deploy your application
3. Test all endpoints
4. Monitor logs for any issues

Happy deploying! 🚀
