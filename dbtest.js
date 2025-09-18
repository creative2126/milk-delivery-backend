import mysql from 'mysql2';

const pool = mysql.createPool({
  host: 'brk1u18dqiijezawbwt3-mysql.services.clever-cloud.com',
  user: 'uojydhhysxq2yvsn',
  password: 'xC0th7iqC8b5iH5IG8fw',
  database: 'brk1u18dqiijezawbwt3',
  port: 3306
});

pool.query('SHOW TABLES', (err, results) => {
  if(err) console.error('Connection error:', err);
  else console.log('Tables:', results);
  pool.end();
});
