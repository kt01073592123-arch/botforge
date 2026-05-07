// Bot egasiga xato yoki muhim hodisa bo‘lganda Telegram orqali xabar yuboradi.
// Bot xato beradigan paytlar: invalid token, AI quota tugadi, webhook tushdi va h.k.
// Spam oldini olish uchun: bir xil xato 30 daqiqada bir marta yuboriladi.

import { db } from "./supabase/server";
import { TgBot } from "./telegram";
import { env } from "./env";
import { rateLimit } from "./ratelimit";

export type AlertKind =
  | "ai_error"
  | "telegram_error"
  | "token_invalid"
  | "limit_reached"
  | "webhook_error";

const KIND_LABEL: Record<AlertKind, string> = {
  ai_error: "AI xatosi",
  telegram_error: "Telegram xatosi",
  token_invalid: "Bot tokeni noto‘g‘ri",
  limit_reached: "Oylik limit tugadi",
  webhook_error: "Webhook xatosi",
};

export async function alertOwner(opts: {
  botId: string;
  kind: AlertKind;
  details?: string;
}) {
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("name, admin_chat_id, owner_id")
    .eq("id", opts.botId)
    .maybeSingle();
  if (!bot?.admin_chat_id) return;

  // 30 daqiqada bir xato turi bir marta
  const ok = await rateLimit({
    scope: "api_user",
    key: `alert|${opts.botId}|${opts.kind}`,
    windowSeconds: 1800,
    limit: 1,
  });
  if (!ok) return;

  const text = [
    `⚠️ <b>${KIND_LABEL[opts.kind]}</b>`,
    `Bot: ${bot.name}`,
    opts.details ? `\n<code>${escapeHtml(opts.details).slice(0, 500)}</code>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Platform bot orqali yuboramiz (foydalanuvchining bot tokeni emas — chunki o‘sha bot
  // ishlamayotgan bo‘lishi mumkin)
  try {
    await new TgBot(env().TELEGRAM_BOT_TOKEN).sendMessage(bot.admin_chat_id, text);
  } catch (e) {
    console.error("[alertOwner] platform bot send failed:", (e as Error).message);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}
