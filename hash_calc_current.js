const crypto = require('crypto');
const fs = require('fs');

const content = fs.readFileSync('current_inline_script.js');
const hash = crypto.createHash('sha256').update(content).digest('base64');
console.log(`'sha256-${hash}'`);
