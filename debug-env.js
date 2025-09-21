require('dotenv').config();

console.log('Environment Variables Debug:');
console.log('==========================');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '[HIDDEN]' : 'undefined');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('==========================');

console.log('\nAll environment variables:');
console.log(Object.keys(process.env).filter(key => key.startsWith('DB_')));
