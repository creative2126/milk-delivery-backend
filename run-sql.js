const mysql = require('mysql2');
const fs = require('fs');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306,
  multipleStatements: true
});

console.log('Connecting to database...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  console.log('Connected to database successfully');

  // Create users table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      phone VARCHAR(20),
      email VARCHAR(255),
      street VARCHAR(255),
      city VARCHAR(255),
      state VARCHAR(255),
      zip VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  // Create subscriptions table
  const createSubscriptionsTable = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      subscription_type VARCHAR(50) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      address TEXT NOT NULL,
      building_name VARCHAR(255) NOT NULL,
      flat_number VARCHAR(50) NOT NULL,
      payment_id VARCHAR(255) NOT NULL,
      status ENUM('active', 'inactive', 'cancelled') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );
  `;

  // Create indexes
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_username ON subscriptions(username);
    CREATE INDEX IF NOT EXISTS idx_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_created_at ON subscriptions(created_at);
  `;

  // Execute queries
  connection.query(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
      connection.end();
      return;
    }
    console.log('Users table created successfully');

    connection.query(createSubscriptionsTable, (err) => {
      if (err) {
        console.error('Error creating subscriptions table:', err);
        connection.end();
        return;
      }
      console.log('Subscriptions table created successfully');

      connection.query(createIndexes, (err) => {
        if (err) {
          console.error('Error creating indexes:', err);
        } else {
          console.log('Indexes created successfully');
        }

        // Verify tables
        connection.query('SHOW TABLES', (err, results) => {
          if (err) {
            console.error('Error showing tables:', err);
          } else {
            console.log('All tables:', results);
          }
          connection.end();
        });
      });
    });
  });
});
