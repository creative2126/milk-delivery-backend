// server.js - Milk Delivery App (COMPLETE FIXED VERSION)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

// Database connection
const db = require('./db');

// Routes
const subscriptionRoutesFixed = require('./routes/subscriptionRoutes-fixed');
const apiRoutes = require('./routes/apiRoutes-complete-fixed');
const optimizedRoutes = require('./routes/optimizedRoutes');
const enhancedSubscriptionRoutes = require('./routes/enhancedSubscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const razorpayConfigRoutes = require('./routes/razorpay-config');
const verifyPaymentRoutes = require('./routes/verify-payment-enhanced');

// Middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const CacheMiddleware = require('./middleware/cacheMiddleware');
const logger = require('./utils/logger');
const databaseValidator = require('./utils/databaseValidator');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Milk Delivery Backend Server...');

// ==================== SECURITY MIDDLEWARE ====================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://checkout.razorpay.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://unpkg.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://api.razorpay.com"
        ],
        connectSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://api.razorpay.com",
          "https://milk-delivery-backend.onrender.com",
          "https://freshndorganic.com",
          "https://www.freshndorganic.com"
        ],
        frameSrc: ["'self'", "https://api.razorpay.com"]
      }
    }
  })
);

// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://freshndorganic.com',
      'https://www.freshndorganic.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

// ==================== BODY PARSING MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ==================== LOGGING MIDDLEWARE ====================
app.use(morgan('combined', { 
  stream: { 
    write: msg => logger.info(msg.trim()) 
  } 
}));

// Custom request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'Unknown'}...`);
  next();
});

// ==================== CACHING & RATE LIMITING ====================
app.use('/api', CacheMiddleware.cacheGet(300));
app.use('/api/user', CacheMiddleware.cacheUserData(600));
app.use('/api', (req, res, next) => CacheMiddleware.clearCache('api')(req, res, next));
app.use('/api/user', (req, res, next) => CacheMiddleware.clearCache('user')(req, res, next));
app.use('/api', CacheMiddleware.rateLimit(200, 15 * 60 * 1000));

// ==================== DATABASE HEALTH CHECK ====================
app.use('/api', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    next();
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    res.status(503).json({ 
      success: false,
      error: 'Service temporarily unavailable',
      message: 'Database connection failed'
    });
  }
});

// ==================== API ROUTES ====================
// IMPORTANT: Mount apiRoutes FIRST to handle /api/login and /api/users correctly
console.log('📦 Loading API routes...');
app.use('/api', apiRoutes);
app.use('/api/subscriptions', subscriptionRoutesFixed);
app.use('/api/optimized', optimizedRoutes);
app.use('/api/enhanced-subscriptions', enhancedSubscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', razorpayConfigRoutes);
app.use('/api', verifyPaymentRoutes);
console.log('✅ All routes loaded successfully');

// ==================== CRON JOB - SUBSCRIPTION EXPIRY ====================
async function checkAndExpireSubscriptions() {
  try {
    console.log('⏰ Running subscription expiry check...');
    const [result] = await db.query(`
      UPDATE users 
      SET subscription_status = 'expired'
      WHERE subscription_status = 'active'
      AND subscription_end_date < NOW()
    `);
    const expiredCount = result?.affectedRows || 0;
    console.log(`✅ Subscription expiry check completed - ${expiredCount} subscription(s) expired`);
    
    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} subscription(s) automatically`);
    }
  } catch (err) {
    console.error('❌ Error while expiring subscriptions:', err);
    logger.error('Subscription expiry cron job failed:', err);
  }
}

// Run daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('\n⏰ Daily subscription expiry cron job triggered');
  checkAndExpireSubscriptions();
});

// Manual trigger endpoint for subscription expiry check
app.get('/api/subscriptions/check-expired', async (req, res) => {
  try {
    console.log('🔧 Manual subscription expiry check triggered');
    const [result] = await db.query(`
      UPDATE users 
      SET subscription_status = 'expired'
      WHERE subscription_status = 'active'
      AND subscription_end_date < NOW()
    `);
    const expiredCount = result?.affectedRows || 0;
    
    res.json({ 
      success: true, 
      message: 'Expired subscriptions updated successfully', 
      updated: expiredCount
    });
  } catch (err) {
    console.error('❌ Manual expiry update failed:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update expired subscriptions' 
    });
  }
});

// ==================== HEALTH CHECK ENDPOINT ====================
app.get('/health', async (req, res) => {
  try {
    const [dbHealth] = await db.query('SELECT 1 AS health');
    const isDbConnected = dbHealth && dbHealth.length > 0;
    
    res.json({ 
      status: 'healthy', 
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== STATIC FILES & FRONTEND ====================
app.use(express.static(path.join(__dirname, '../frontend/public'), { 
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ==================== 404 HANDLER FOR API ROUTES ====================
app.use('/api/*', (req, res) => {
  console.log('❌ 404 - API route not found:', req.path);
  res.status(404).json({ 
    success: false,
    error: 'API route not found', 
    path: req.path,
    method: req.method
  });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('💥 Global error handler:', err);
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== START SERVER ====================
async function startServer() {
  try {
    console.log('\n🔍 Validating database schema...');
    await databaseValidator.validateSchema();
    console.log('✅ Database schema validated');
    
    const server = app.listen(PORT, () => {
      console.log('\n┌─────────────────────────────────────────────┐');
      console.log(`│  🚀 Server running on port ${PORT}          │`);
      console.log(`│  📍 Environment: ${process.env.NODE_ENV || 'development'}              │`);
      console.log(`│  🌐 URL: http://localhost:${PORT}            │`);
      console.log('└─────────────────────────────────────────────┘\n');
      logger.info(`Server started on port ${PORT}`);
    });
    
    server.timeout = 30000; // 30 second timeout
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        db.end();
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, startServer };
