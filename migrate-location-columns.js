const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306,
  multipleStatements: true
});

console.log('Running migration to add location columns...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  console.log('Connected to database successfully');

  // Read the migration SQL file
  const migrationSQL = fs.readFileSync(path.join(__dirname, 'add-location-columns.sql'), 'utf8');

  // Execute the migration
  connection.query(migrationSQL, (error, results) => {
    if (error) {
      console.error('Error running migration:', error);
    } else {
      console.log('Migration completed successfully');
      console.log('Results:', results);
    }
    
    // Verify the schema
    connection.query('DESCRIBE subscriptions', (err, results) => {
      if (err) {
        console.error('Error describing subscriptions table:', err);
      } else {
        console.log('Subscriptions table schema:');
        results.forEach(column => {
          console.log(`${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
      connection.end();
    });
  });
});
