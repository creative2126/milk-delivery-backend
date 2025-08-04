const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306
});

// Read the SQL file
const sqlFile = fs.readFileSync(path.join(__dirname, 'setup-database.sql'), 'utf8');

// Split the SQL file into individual statements
const statements = sqlFile
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

console.log('Setting up database tables...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  console.log('Connected to database successfully');

  // Execute each SQL statement
  let completed = 0;
  statements.forEach((statement, index) => {
    if (statement.trim()) {
      connection.query(statement, (error, results) => {
        if (error) {
          console.error(`Error executing statement ${index + 1}:`, error);
        } else {
          console.log(`Statement ${index + 1} executed successfully`);
        }
        
        completed++;
        if (completed === statements.length) {
          // Verify tables were created
          connection.query('SHOW TABLES', (err, results) => {
            if (err) {
              console.error('Error showing tables:', err);
            } else {
              console.log('Tables created:', results);
            }
            connection.end();
          });
        }
      });
    } else {
      completed++;
    }
  });
});
