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

// Database
const db = require('./db');

// Routes
const subscriptionRoutes = require('./routes/subscriptionRoutes-fixed');
const apiRoutes = require('./routes/apiRoutes-complete-fixed');
const optimizedRoutes = require('./routes/optimizedRoutes');
const enhancedSubscriptionRoutes = require('./routes/enhancedSubscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const razorpayConfigRoutes = require('./routes/razorpay-config');
const verifyPaymentRoutes = require('./routes/verify-payment-enhanced');

// Middleware
const CacheMiddleware = require('./middleware/cacheMiddleware');
const databaseValidator = require('./utils/databaseValidator');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'mysecretkey';

// -------------------- Security --------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://checkout.razorpay.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://unpkg.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://api.razorpay.com"],
        connectSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
          "https://api.razorpay.com",
          "https://milk-delivery-backend.onrender.com",
          "https://freshndorganic.com",
          "https://www.freshndorganic.com",
        ],
        frameSrc: ["'self'", "https://api.razorpay.com"],
      },
    },
  })
);

// -------------------- Middleware --------------------
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://freshndorganic.com',
    'https://www.freshndorganic.com',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// -------------------- Health check --------------------
app.use('/api', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    next();
  } catch (err) {
    logger.error('DB connection failed:', err);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// -------------------- Authentication --------------------

// Register
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, phone, email } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email required' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, password, name, phone, email) VALUES (?, ?, ?, ?, ?)', [username, hashedPassword, name, phone, email]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const [result] = await db.query('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [username, username]);
    const user = result?.[0];
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role || 'user' }, SECRET_KEY, { expiresIn: '24h' });

    res.json({ success: true, token, userName: user.name || user.username, userEmail: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// -------------------- API Routes --------------------
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', apiRoutes);
app.use('/api/optimized', optimizedRoutes);
app.use('/api/enhanced-subscriptions', enhancedSubscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', razorpayConfigRoutes);
app.use('/api', verifyPaymentRoutes);

// -------------------- Subscription Auto-Expiry --------------------
async function checkAndExpireSubscriptions() {
  try {
    const [result] = await db.query(`
      UPDATE users
      SET subscription_status = 'expired'
      WHERE subscription_status = 'active' AND subscription_end_date < NOW()
    `);
    console.log(`Subscription expiry check: ${result?.affectedRows || 0} expired.`);
  } catch (err) {
    console.error('Error expiring subscriptions:', err);
  }
}
cron.schedule('0 0 * * *', () => checkAndExpireSubscriptions());

// Manual trigger
app.get('/api/subscriptions/check-expired', async (req, res) => {
  try {
    const [result] = await db.query(`
      UPDATE users
      SET subscription_status = 'expired'
      WHERE subscription_status = 'active' AND subscription_end_date < NOW()
    `);
    res.json({ success: true, updated: result?.affectedRows || 0 });
  } catch (err) {
    console.error('Manual expiry failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update expired subscriptions' });
  }
});

// -------------------- Health --------------------
app.get('/health', async (req, res) => {
  try {
    const [dbHealth] = await db.query('SELECT 1 AS health');
    res.json({ status: 'healthy', database: dbHealth ? 'connected' : 'disconnected', timestamp: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// -------------------- Static / Frontend --------------------
app.use(express.static(path.join(__dirname, '../frontend/public'), { maxAge: '1d' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/index.html')));

// -------------------- 404 --------------------
app.use('/api/*', (req, res) => res.status(404).json({ error: 'API route not found', path: req.path }));

// -------------------- Start --------------------
async function startServer() {
  try {
    await databaseValidator.validateSchema();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}
startServer();

module.exports = { app, startServer };
