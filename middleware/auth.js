// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
    if (err) {
      logger.error('JWT verification failed:', err);
      return res.status(403).json({ success: false, message: 'Token invalid' });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
