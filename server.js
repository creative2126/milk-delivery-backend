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
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const subscriptionRoutesUpdated = require('./routes/subscriptionRoutes-updated');
const apiRoutes = require('./routes/apiRoutes');
const optimizedRoutes = require('./routes/optimizedRoutes');
const enhancedSubscriptionRoutes = require('./routes/enhancedSubscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');

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
const PORT = process.env.PORT || 3001; // Changed to 3001 to match your setup
const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey";

// -------------------- Security Middleware (CSP) --------------------
app.use((req, res, next) => {
  const inlineScriptHashes = [
    "'sha256-KRpO9edhx1uhZkGLX6F5Y+/w7JMVPwRsNLRMW4227dY='",
    "'sha256-FksEQ+TdNXu8T3PXQG+EGWf/8p0YUt+3+WKC27EX2K8='",
    "'sha256-ex8EDmxx01iTEy3jd1QlKx9JTFFKY/lvk0FjW85jBsU='",
    "'sha256-BOuSyAiCk1QrT/K01hHrEK7BSHKx0UBv+Zrap6shq9Q='",
    "'sha256-RK4pQ8K05ryVkhksx+iQ5ixbrB++A0eS6TEbogTMLKM='"
  ];

  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrcAttr: ["'unsafe-inline'"],
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://checkout.razorpay.com",
          ...inlineScriptHashes
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
          "https://api.razorpay.com",
          "https://a.tile.openstreetmap.org",
          "https://b.tile.openstreetmap.org",
          "https://c.tile.openstreetmap.org"
        ],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
        frameSrc: [
          "'self'",
          "https://api.razorpay.com"
        ]
      }
    }
  })(req, res, next);
});

// -------------------- Core Middleware --------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// -------------------- Caching & Rate Limiting --------------------
app.use('/api', CacheMiddleware.cacheGet(300));
app.use('/api/user', CacheMiddleware.cacheUserData(600));
app.use('/api', (req, res, next) => CacheMiddleware.clearCache('api')(req, res, next));
app.use('/api/user', (req, res, next) => CacheMiddleware.clearCache('user')(req, res, next));
app.use('/api', CacheMiddleware.rateLimit(200, 15 * 60 * 1000));

// -------------------- Database Health Check Middleware --------------------
app.use(async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    next();
  } catch (error) {
    logger.error('Database connection failed:', error);
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

// -------------------- User Authentication --------------------
// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    // Find user by username or email
    const query = 'SELECT * FROM users WHERE username = ? OR email = ?';
    const users = await db.query(query, [username, username]);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const user = users[0];
    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    // Success
    return res.json({
      success: true,
      userName: user.name || user.username,
      userEmail: user.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Register
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, phone, email } = req.body;

    console.log('📝 Registration attempt:', { username, email, name, phone, hasPassword: !!password });

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    // Check if user already exists
    try {
      const existingUserResult = await db.query(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, email]
      );

      console.log('🔍 Existing user check result:', existingUserResult);

      let existingUser = null;
      if (Array.isArray(existingUserResult) && Array.isArray(existingUserResult[0])) {
        existingUser = existingUserResult[0][0];
      } else if (Array.isArray(existingUserResult) && existingUserResult[0]) {
        existingUser = existingUserResult[0];
      }

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists with this username or email' });
      }
    } catch (checkError) {
      console.error('Error checking existing user:', checkError);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed successfully');

    const query = `
      INSERT INTO users (username, password, name, phone, email)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await db.query(query, [username, hashedPassword, name, phone, email]);
    console.log('✅ User inserted successfully:', result);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Register error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage && error.sqlMessage.includes('users.username')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      if (error.sqlMessage && error.sqlMessage.includes('users.email')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(409).json({ error: 'User already exists' });
    }

    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Database table not found. Please contact administrator.' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔑 Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await db.query(
      `SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username, username]
    );

    console.log('🗃️ Raw database result:', result);
    console.log('🗃️ Result type:', typeof result);
    console.log('🗃️ Result structure:', Array.isArray(result) ? 'Array' : 'Object');

    // Handle different database response formats
    let rows;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      // Format: [[rows], metadata] - common with mysql2
      rows = result[0];
      console.log('🗃️ Using result[0] format, rows:', rows.length);
    } else if (Array.isArray(result)) {
      // Format: [rows] - common with some MySQL drivers
      rows = result;
      console.log('🗃️ Using direct array format, rows:', rows.length);
    } else {
      console.error('❌ Unexpected result format:', result);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!rows || rows.length === 0) {
      console.log('❌ No user found for:', username);
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = rows[0];
    console.log('👤 Found user:', {
      id: user?.id,
      username: user?.username,
      email: user?.email,
      hasPassword: !!user?.password
    });

    if (!user || !user.password) {
      console.log('❌ User or password field missing');
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    console.log('🔐 Comparing passwords...');
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('🔐 Password validation result:', validPassword);

    if (!validPassword) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    console.log('✅ Login successful for:', username);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user' // Default to 'user' if no role
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- API Routes --------------------
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscriptions/v2', authenticateToken, subscriptionRoutesUpdated);
app.use('/api', apiRoutes);
app.use('/api/optimized', optimizedRoutes);
app.use('/api/enhanced-subscriptions', enhancedSubscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// -------------------- Health Check --------------------
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.query('SELECT 1 AS health');
    res.json({
      status: 'healthy',
      database: dbHealth[0][0].health === 1 ? 'connected' : 'disconnected',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// -------------------- Static Files --------------------
app.use(express.static(path.join(__dirname, '../frontend/public'), { maxAge: '1d' }));

// -------------------- Frontend Routes --------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/home.html'));
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

// -------------------- Profile Redirect --------------------
function isLoggedIn(req) {
  return req.headers['x-user-loggedin'] === 'true';
}


// -------------------- 404 Handlers --------------------
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// All other frontend routes → fallback to home.html
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/home.html'));
});

// -------------------- Start Server --------------------
async function startServer() {
  try {
    await databaseValidator.validateSchema();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    server.timeout = 30000;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, startServer };
