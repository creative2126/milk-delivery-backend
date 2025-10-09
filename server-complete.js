const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Database connection
const db = require('./db');

// Routes
const subscriptionRoutesFixed = require('./routes/subscriptionRoutes-fixed');
// const subscriptionRoutesUpdated = require('./routes/subscriptionRoutes-updated'); // Commented out due to Sequelize dependency issues
const apiRoutes = require('./routes/apiRoutes-complete-fixed'); // Updated to use complete API routes with pause/resume
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
// FIXED CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
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
    maxAge: 600 // Cache preflight for 10 minutes
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Log all incoming requests for debugging
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

// -------------------- Database Health Check (API routes only) --------------------
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
// Register
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, phone, email } = req.body;
    
    console.log('📝 Registration attempt:', { username, email });
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    // Check if user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (Array.isArray(existing) && existing.length > 0) {
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
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const query = 'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1';
    const result = await db.query(query, [username, username]);

    let user;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      user = result[0][0];
    } else if (Array.isArray(result)) {
      user = result[0];
    }

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful:', username);
    
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
console.log('🔗 Registering API routes...');
app.use('/api/subscriptions', subscriptionRoutesFixed);
// app.use('/api/subscriptions/v2', authenticateToken, subscriptionRoutesUpdated); // Commented out due to Sequelize dependency issues - subscriptionRoutesUpdated is not defined
app.use('/api', apiRoutes); // Using complete API routes with pause/resume functionality
app.use('/api/optimized', optimizedRoutes);
app.use('/api/enhanced-subscriptions', enhancedSubscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes); // ✅ Admin routes registered
app.use('/api', razorpayConfigRoutes);
app.use('/api', verifyPaymentRoutes);
console.log('✅ API routes registered successfully');

// -------------------- Health Check --------------------
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.query('SELECT 1 AS health');
    let isConnected = false;

    if (Array.isArray(dbHealth)) {
      if (Array.isArray(dbHealth[0])) {
        isConnected = dbHealth[0][0]?.health === 1;
      } else {
        isConnected = dbHealth[0]?.health === 1;
      }
    }

    res.json({
      status: 'healthy',
      database: isConnected ? 'connected' : 'disconnected',
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
  res.sendFile(path.join(__dirname, 'https://freshndorganic.com/index.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/profile.html'));
});
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-login.html'));
});
app.get('/admin-fixed', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-fixed.html'));
});

// -------------------- 404 Handlers (moved to end) --------------------
app.use('/api/*', (req, res) => {
  console.log('❌ 404 API route not found:', req.path);
  res.status(404).json({ error: 'API route not found', path: req.path });
});

// Handle non-API routes (frontend routes)
app.use('*', (req, res, next) => {
  // Skip API routes - let them fall through to 404
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// -------------------- Start Server --------------------
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    console.log('📦 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? 'Set' : 'Using default');
    console.log('💳 Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? 'Set ✅' : 'Missing ❌');
    console.log('🔐 Razorpay Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Set ✅' : 'Missing ❌');
    
    await databaseValidator.validateSchema();
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Server is ready and listening on port ${PORT}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
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
