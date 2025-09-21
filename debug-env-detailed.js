const dotenv = require('dotenv');
const path = require('path');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

console.log('\nTrying to load .env file...');

// Try loading from current directory
const result1 = dotenv.config();
console.log('dotenv.config() result:', result1);

console.log('\nTrying to load .env from backend directory...');
const result2 = dotenv.config({ path: path.join(__dirname, '.env') });
console.log('dotenv.config({path: backend/.env}) result:', result2);

console.log('\nEnvironment Variables after loading:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[HIDDEN]' : 'undefined');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

console.log('\nAll DB_ environment variables:');
console.log(Object.keys(process.env).filter(key => key.startsWith('DB_')));
