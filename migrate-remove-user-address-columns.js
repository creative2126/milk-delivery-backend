const db = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: Remove address columns from users table');

    await db.execute('ALTER TABLE users DROP COLUMN street');
    await db.execute('ALTER TABLE users DROP COLUMN city');
    await db.execute('ALTER TABLE users DROP COLUMN state');
    await db.execute('ALTER TABLE users DROP COLUMN zip');
    await db.execute('ALTER TABLE users DROP COLUMN address');

    console.log('Migration completed: Address columns removed from users table');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
