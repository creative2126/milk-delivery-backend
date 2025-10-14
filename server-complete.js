// server.js - Milk Delivery App
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

const { authenticateToken } = require('./middleware/auth');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const validation = require('./middleware/validation');
const CacheMiddleware = require('./middleware/cacheMiddleware');

// Utilities
const logger = require('./utils/logger');
const queryOptimizer = require('./utils/queryOptimizer');
const databaseValidator = require('./utils/databaseValidator');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey";

// -------------------- Security Middleware --------------------
app.use((req, res, next) => {
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
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
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
  })(req, res, next);
});

// -------------------- Core Middleware --------------------
app.use(cors({
  origin: function (origin, callback) {
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
      console.log('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// -------------------- Logs --------------------
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// -------------------- Caching & Rate Limiting --------------------
app.use('/api', CacheMiddleware.cacheGet(300));
app.use('/api/user', CacheMiddleware.cacheUserData(600));
app.use('/api', (req, res, next) => CacheMiddleware.clearCache('api')(req, res, next));
app.use('/api/user', (req, res, next) => CacheMiddleware.clearCache('user')(req, res, next));
app.use('/api', CacheMiddleware.rateLimit(200, 15 * 60 * 1000));

// -------------------- Database Health Check --------------------
app.use('/api', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    next();
  } catch (error) {
    logger.error('Database connection failed:', error);
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

// -------------------- Authentication --------------------

// Registration
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, phone, email } = req.body;
    console.log('📝 Registration attempt:', { username, email });

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existing && existing.length > 0) {
      console.log('❌ User already exists:', username);
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password, name, phone, email) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, phone, email]
    );

    console.log('✅ User registered successfully:', username);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 Login attempt:', username);
    console.log('📦 Raw request body:', req.body);

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Email/Username and password required' });
    }

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [username, username]
    );

    console.log('DB rows:', rows);

    const user = rows[0];
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);

    if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      userName: user.name || user.username,
      userEmail: user.email
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// -------------------- API Routes --------------------
app.use('/api/subscriptions', subscriptionRoutesFixed);
app.use('/api', apiRoutes);
app.use('/api/optimized', optimizedRoutes);
app.use('/api/enhanced-subscriptions', enhancedSubscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', razorpayConfigRoutes);
app.use('/api', verifyPaymentRoutes);

// -------------------- Auto Expiry System --------------------
async function checkAndExpireSubscriptions() {
  try {
    const [result] = await db.query(`
      UPDATE users 
      SET subscription_status = 'expired'
      WHERE subscription_status = 'active'
      AND subscription_end_date < NOW()
    `);
    console.log(`🕒 Subscription expiry check done — ${result?.affectedRows || 0} expired.`);
  } catch (err) {
    console.error('❌ Error while expiring subscriptions:', err);
  }
}

// Daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('⏰ Running daily subscription expiry check...');
  checkAndExpireSubscriptions();
});

// Manual trigger
app.get('/api/subscriptions/check-expired', async (req, res) => {
  try {
    const [result] = await db.query(`
      UPDATE users 
      SET subscription_status = 'expired'
      WHERE subscription_status = 'active'
      AND subscription_end_date < NOW()
    `);
    res.json({
      success: true,
      message: 'Expired subscriptions updated successfully',
      updated: result?.affectedRows || 0
    });
  } catch (err) {
    console.error('❌ Manual expiry update failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update expired subscriptions' });
  }
});

// -------------------- Health Check --------------------
app.get('/health', async (req, res) => {
  try {
    const [dbHealth] = await db.query('SELECT 1 AS health');
    res.json({
      status: 'healthy',
      database: dbHealth ? 'connected' : 'disconnected',
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// -------------------- Static Files --------------------
app.use(express.static(path.join(__dirname, '../frontend/public'), { maxAge: '1d' }));

// -------------------- Frontend Routes --------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// -------------------- 404 Handler --------------------
app.use('/api/*', (req, res) => {
  console.log('❌ 404 API route not found:', req.path);
  res.status(404).json({ error: 'API route not found', path: req.path });
});

// -------------------- Start Server --------------------
async function startServer() {
  try {
    await databaseValidator.validateSchema();
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Server listening on port ${PORT}`);
    });
    server.timeout = 30000;
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, startServer };
