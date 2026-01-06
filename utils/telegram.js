const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const TELEGRAM_BOT_TOKEN = "8181071521:AAElH_NuLN18892seBCZ_vlxXbXmcy7w3Is";
const TELEGRAM_CHAT_ID = "-1003453123855";

async function sendTelegramAlert(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML"
      })
    });

    console.log("✅ Telegram alert sent");
  } catch (err) {
    console.error("❌ Telegram alert failed:", err);
  }
}

module.exports = { sendTelegramAlert };
