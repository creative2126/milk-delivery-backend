const mysql = require('mysql2');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk_delivery',
  port: 3306
});

console.log('Populating sample location data...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  console.log('Connected to database successfully');

  // Sample location data for Mumbai area
  const sampleLocations = [
    { lat: 19.0760, lng: 72.8777, address: 'Mumbai, Maharashtra' }, // Mumbai
    { lat: 19.2183, lng: 72.9781, address: 'Andheri West, Mumbai' }, // Andheri
    { lat: 19.0176, lng: 72.8562, address: 'Bandra West, Mumbai' }, // Bandra
    { lat: 19.1197, lng: 72.8464, address: 'Dadar, Mumbai' }, // Dadar
    { lat: 19.1550, lng: 72.9930, address: 'Powai, Mumbai' } // Powai
  ];

  // Update existing subscriptions with sample location data
  const updateQuery = `
    UPDATE subscriptions 
    SET latitude = ?, longitude = ?
    WHERE id = ?
  `;

  // Get existing subscriptions
  connection.query('SELECT id FROM subscriptions ORDER BY id LIMIT 5', (err, results) => {
    if (err) {
      console.error('Error fetching subscriptions:', err);
      connection.end();
      return;
    }

    if (results.length === 0) {
      console.log('No subscriptions found to update');
      connection.end();
      return;
    }

    console.log(`Found ${results.length} subscriptions to update with location data`);

    let completed = 0;
    results.forEach((subscription, index) => {
      const location = sampleLocations[index % sampleLocations.length];
      
      connection.query(updateQuery, [location.lat, location.lng, subscription.id], (err, result) => {
        if (err) {
          console.error(`Error updating subscription ${subscription.id}:`, err);
        } else {
          console.log(`Updated subscription ${subscription.id} with location: ${location.lat}, ${location.lng}`);
        }
        
        completed++;
        if (completed === results.length) {
          console.log('Location data population completed');
          
          // Verify the updates
          connection.query('SELECT id, username, address, latitude, longitude FROM subscriptions WHERE latitude IS NOT NULL', (err, results) => {
            if (err) {
              console.error('Error verifying updates:', err);
            } else {
              console.log(`Successfully updated ${results.length} subscriptions with location data:`);
              results.forEach(sub => {
                console.log(`- ID: ${sub.id}, Username: ${sub.username}, Location: ${sub.latitude}, ${sub.longitude}`);
              });
            }
            connection.end();
          });
        }
      });
    });
  });
});
