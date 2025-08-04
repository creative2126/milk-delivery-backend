const bcrypt = require('bcryptjs');
const db = require('./db');

async function setupAdminUser() {
  try {
    // Check if admin user already exists
    const [existingAdmins] = await db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      ['admin', 'admin@milkdelivery.com']
    );

    if (existingAdmins.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password, email, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin@milkdelivery.com', 'Admin User', '9999999999', 'admin']
    );

    console.log('Admin user created successfully');
    console.log('Admin Login Details:');
    console.log('Username: admin');
    console.log('Email: admin@milkdelivery.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error setting up admin user:', error);
  } finally {
    process.exit(0);
  }
}

setupAdminUser();
