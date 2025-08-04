const mysql = require('mysql2');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306
});

console.log('Testing API response format...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  console.log('Connected to database successfully');

  // Test the exact query that the API uses
  const apiQuery = `
    SELECT 
      id, 
      username, 
      subscription_type, 
      duration, 
      amount, 
      address, 
      building_name, 
      flat_number, 
      latitude, 
      longitude, 
      status, 
      created_at,
      payment_id
    FROM subscriptions 
    ORDER BY created_at DESC
  `;

  connection.query(apiQuery, (err, results) => {
    if (err) {
      console.error('Error fetching subscriptions:', err);
      connection.end();
      return;
    }

    console.log(`Found ${results.length} total subscriptions`);
    console.log(`Found ${results.filter(s => s.latitude && s.longitude).length} subscriptions with location data`);

    console.log('\n=== API Response Format Test ===');
    results.slice(0, 5).forEach((sub, index) => {
      console.log(`\nSubscription ${index + 1}:`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  Username: ${sub.username}`);
      console.log(`  Address: ${sub.address || 'N/A'}`);
      console.log(`  Building: ${sub.building_name || 'N/A'}`);
      console.log(`  Flat: ${sub.flat_number || 'N/A'}`);
      console.log(`  Latitude: "${sub.latitude}" (type: ${typeof sub.latitude}, null: ${sub.latitude === null})`);
      console.log(`  Longitude: "${sub.longitude}" (type: ${typeof sub.longitude}, null: ${sub.longitude === null})`);
      
      // Test the exact condition from the frontend
      const hasLocation = sub.latitude && sub.longitude && sub.latitude !== 'null' && sub.longitude !== 'null';
      console.log(`  Should show map: ${hasLocation}`);
      
      if (hasLocation) {
        console.log(`  Map URL: https://www.google.com/maps?q=${sub.latitude},${sub.longitude}`);
      }
    });

    console.log('\n=== Summary ===');
    console.log(`Total subscriptions: ${results.length}`);
    console.log(`With location data: ${results.filter(s => s.latitude && s.longitude && s.latitude !== 'null' && s.longitude !== 'null').length}`);
    console.log(`Without location data: ${results.filter(s => !s.latitude || !s.longitude || s.latitude === 'null' || s.longitude === 'null').length}`);

    connection.end();
  });
});
