const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration with provided credentials
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'sushanth2126',
  database: 'milk',
  multipleStatements: true
};

async function runMigration() {
  let connection;
  try {
    console.log('Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected successfully!');
    
    // Read and execute the SQL migration file
    const sqlFilePath = path.join(__dirname, 'create-subscription-tables.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    console.log('Executing migration SQL...');
    await connection.execute(sqlContent);
    
    console.log('✅ Migration completed successfully!');
    console.log('Subscription system tables have been created in the database.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Handle specific error cases
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('Database "milk" does not exist. Please create it first:');
      console.error('CREATE DATABASE milk;');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Database authentication failed. Please check credentials.');
    } else {
      console.error('Unexpected error:', error);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the migration
runMigration();
