const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "-1003453123855";

async function sendTelegramMessage(text) {
  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML"
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("✅ Telegram sent:", res.data.result.message_id);
  } catch (err) {
    console.error(
      "❌ Telegram failed:",
      err.response?.data || err.message
    );
  }
}

module.exports = { sendTelegramMessage };
