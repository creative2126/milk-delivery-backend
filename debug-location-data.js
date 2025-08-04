const mysql = require('mysql2');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306
});

console.log('Debugging location data...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  console.log('Connected to database successfully');

  // Check the actual data types and values
  connection.query('SELECT id, username, address, latitude, longitude FROM subscriptions WHERE latitude IS NOT NULL LIMIT 5', (err, results) => {
    if (err) {
      console.error('Error fetching subscriptions:', err);
      connection.end();
      return;
    }

    console.log('Found subscriptions with location data:');
    results.forEach(sub => {
      console.log(`- ID: ${sub.id}`);
      console.log(`  Username: ${sub.username}`);
      console.log(`  Address: ${sub.address}`);
      console.log(`  Latitude: ${sub.latitude} (type: ${typeof sub.latitude})`);
      console.log(`  Longitude: ${sub.longitude} (type: ${typeof sub.longitude})`);
      console.log(`  Latitude null check: ${sub.latitude === null}`);
      console.log(`  Longitude null check: ${sub.longitude === null}`);
      console.log(`  Latitude string check: ${sub.latitude === 'null'}`);
      console.log(`  Longitude string check: ${sub.longitude === 'null'}`);
      console.log('---');
    });

    // Test the exact condition from the admin page
    console.log('\nTesting Google Maps button condition:');
    results.forEach(sub => {
      const shouldShowMap = sub.latitude && sub.longitude && sub.latitude !== 'null' && sub.longitude !== 'null';
      console.log(`Subscription ${sub.id}: ${shouldShowMap ? 'SHOW MAP' : 'HIDE MAP'}`);
    });

    connection.end();
  });
});
