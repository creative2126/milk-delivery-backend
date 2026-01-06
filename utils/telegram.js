const axios = require('axios');

const BOT_TOKEN = '8181071521:AAElH_NuLN18892seBCZ_vlxXbXmcy7w3Is';
const CHAT_ID = '1003453123855';

async function sendTelegramAlert(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  });
}

module.exports = { sendTelegramAlert };
