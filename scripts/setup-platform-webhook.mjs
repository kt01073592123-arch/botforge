// Platforma boti uchun webhook ni Telegram’ga o‘rnatadi.
// Bir martalik script — deploy URL o‘zgarsa qayta ishga tushiring.
//
// Foydalanish:
//   node scripts/setup-platform-webhook.mjs
//
// Env: TELEGRAM_BOT_TOKEN, WEBHOOK_BASE_URL, WEBHOOK_SECRET

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE = process.env.WEBHOOK_BASE_URL;
const SECRET = process.env.WEBHOOK_SECRET;

if (!TOKEN || !BASE || !SECRET) {
  console.error(
    "Kerak: TELEGRAM_BOT_TOKEN, WEBHOOK_BASE_URL, WEBHOOK_SECRET env"
  );
  process.exit(1);
}

const url = `${BASE}/api/tg-platform`;

const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: SECRET,
    // Bot API 9.6: managed_bot turini olish uchun allowed_updates ga qo‘shamiz
    allowed_updates: ["message", "callback_query", "managed_bot"],
    drop_pending_updates: true,
  }),
});
const data = await res.json();
if (!data.ok) {
  console.error("Webhook xato:", data);
  process.exit(2);
}
console.log("✓ Platform webhook o‘rnatildi:", url);

// Bot Management Mode tekshirish
const me = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`).then((r) =>
  r.json()
);
console.log(`✓ Bot: @${me.result.username}`);
if (!me.result.can_manage_bots) {
  console.warn(
    "\n⚠️  can_manage_bots = false — Managed Bot flow ishlamaydi.\n" +
      "   BotFather → /mybots → @" +
      me.result.username +
      " → Bot Settings → Allow Bot Creation"
  );
} else {
  console.log("✓ Bot Management Mode yoqilgan");
}

// Webhook info
const info = await fetch(
  `https://api.telegram.org/bot${TOKEN}/getWebhookInfo`
).then((r) => r.json());
console.log("\nWebhook info:");
console.log("  URL:", info.result.url);
console.log("  Pending:", info.result.pending_update_count);
console.log("  Allowed:", info.result.allowed_updates);
