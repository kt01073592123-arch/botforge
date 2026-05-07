// Telegram Managed Bots (Bot API 9.6) flow logikasi.
// User WebApp ichida "Avtomatik bot yaratish" ni bossa, biz platforma boti
// orqali Telegram chatga `request_managed_bot` keyboard tugmasi yuboramiz.
// User Telegram’ning native UI’sida bot yaratganida `managed_bot` update keladi —
// shu yerda token chaqirib, encrypted holda DB’ga bog‘laymiz.

import { randomBytes, randomInt } from "node:crypto";
import { db } from "./supabase/server";
import { TgBot, TelegramApiError } from "./telegram";
import type { TgUser } from "./telegram";
import { encryptToken } from "./encryption";
import { env } from "./env";
import type { BotRow } from "./supabase/types";

// Telegram bot username 5–32 belgi, faqat a-z, 0-9, _; oxiri "bot" bilan tugashi shart.
function suggestedUsername(seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  // Konfliktni kamaytirish uchun qisqa tasodifiy suffiks
  const rnd = randomBytes(2).toString("hex"); // 4 belgi
  const base = slug || "bf";
  return `${base}_${rnd}_bot`.slice(0, 32);
}

function suggestedName(bot: BotRow): string {
  const n = (bot.business_name || bot.name || "BotForge").trim();
  return n.slice(0, 64);
}

// Signed 32-bit positive int (Telegram talabi)
function genRequestId(): number {
  // 1..2^31-1 — manfiy bo‘lmasligi uchun
  return randomInt(1, 0x7fffffff);
}

export type StartManagedFlowResult = {
  request_id: number;
  suggested_username: string;
  suggested_name: string;
  sent_to_chat_id: number;
};

// 1-bosqich: WebApp tugmasi → keyboard yuborish.
// Foydalanuvchining platforma bot bilan chat’iga (chat_id = telegram_id) xabar yuboramiz.
export async function startManagedBotCreation(opts: {
  ownerId: string;
  ownerTelegramId: number;
  bot: BotRow;
}): Promise<StartManagedFlowResult> {
  const platform = new TgBot(env().TELEGRAM_BOT_TOKEN);

  // Manager bot Bot Management Mode yoqilganligini tekshiramiz
  let me;
  try {
    me = await platform.getMe();
  } catch (e) {
    throw new Error(
      `Platforma bot bilan bog‘lanib bo‘lmadi: ${(e as Error).message}`
    );
  }
  if (!(me as TgUser).can_manage_bots) {
    throw new Error(
      "Platforma bot uchun BotFather'da Bot Management Mode yoqilmagan. " +
        "BotFather → /mybots → @" +
        (me as TgUser).username +
        " → Bot Settings → Allow Bot Creation"
    );
  }

  const requestId = genRequestId();
  const username = suggestedUsername(opts.bot.business_name || opts.bot.name);
  const name = suggestedName(opts.bot);

  // DB’ga pending request yozamiz (idempotentlik uchun)
  const sb = db();
  await sb
    .from("bots")
    .update({
      managed_request_id: requestId,
      managed_pending_at: new Date().toISOString(),
      creation_method: "managed",
    })
    .eq("id", opts.bot.id)
    .eq("owner_id", opts.ownerId);

  // Tugma bilan xabar yuboramiz
  // (Foydalanuvchi platforma boti bilan oldin /start qilgan bo‘lishi shart)
  try {
    await platform.sendMessage(
      opts.ownerTelegramId,
      `🤖 <b>${name}</b> uchun yangi bot yarating.\n\n` +
        `Quyidagi tugmani bosing — Telegram’ning rasmiy oynasi ochiladi. ` +
        `Bot yaratilgandan so‘ng avtomatik BotForge’ga bog‘lanadi.`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: "🤖 Botni avtomatik yaratish",
                request_managed_bot: {
                  request_id: requestId,
                  suggested_name: name,
                  suggested_username: username,
                },
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } catch (e) {
    if (e instanceof TelegramApiError && e.code === 403) {
      throw new Error(
        "Platforma boti sizga xabar yubora olmadi. Telegram’da @" +
          (me as TgUser).username +
          " ga /start yuboring va qaytadan urinib ko‘ring."
      );
    }
    throw e;
  }

  return {
    request_id: requestId,
    suggested_username: username,
    suggested_name: name,
    sent_to_chat_id: opts.ownerTelegramId,
  };
}

// 2-bosqich: managed_bot update keldi → token olish va saqlash.
// Idempotent: agar pending draft topilmasa (allaqachon ulangan/duplicate event), no-op.
export type CompleteManagedFlowResult = {
  ok: boolean;
  bot_id?: string; // bizning ichki UUID
  reason?: string;
};

export async function completeManagedBotCreation(opts: {
  creatorTelegramId: number;
  newBot: TgUser;
}): Promise<CompleteManagedFlowResult> {
  const sb = db();

  // 1. Allaqachon shu tg_bot_id ulanganmi? (duplicate event)
  const { data: existing } = await sb
    .from("bots")
    .select("id, status")
    .eq("tg_bot_id", opts.newBot.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return { ok: true, bot_id: existing.id as string, reason: "already_linked" };
  }

  // 2. Creator’ning eng so‘nggi pending draft’ini topamiz
  const { data: appUser } = await sb
    .from("app_users")
    .select("id, telegram_id")
    .eq("telegram_id", opts.creatorTelegramId)
    .maybeSingle();
  if (!appUser) {
    return { ok: false, reason: "creator_not_registered" };
  }

  const { data: draft } = await sb
    .from("bots")
    .select("*")
    .eq("owner_id", appUser.id)
    .is("tg_bot_id", null)
    .is("deleted_at", null)
    .not("managed_pending_at", "is", null)
    .order("managed_pending_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!draft) {
    return { ok: false, reason: "no_pending_draft" };
  }

  // 3. Tokenni olish (manager bot tokeni bilan)
  const platform = new TgBot(env().TELEGRAM_BOT_TOKEN);
  let token: string;
  try {
    token = await platform.getManagedBotToken(opts.newBot.id);
  } catch (e) {
    return {
      ok: false,
      reason: `getManagedBotToken_failed: ${(e as Error).message}`,
    };
  }
  // Hech qachon logga chiqarmaymiz

  // 4. Encrypt + save
  const enc = encryptToken(token);
  await sb.from("bot_secrets").upsert({
    bot_id: draft.id,
    encrypted_token: enc.encrypted,
    iv: enc.iv,
    auth_tag: enc.authTag,
    rotated_at: new Date().toISOString(),
  });

  await sb
    .from("bots")
    .update({
      tg_bot_id: opts.newBot.id,
      tg_username: opts.newBot.username ?? null,
      tg_first_name: opts.newBot.first_name ?? null,
      managed_pending_at: null,
    })
    .eq("id", draft.id);

  // 5. Webhookni yangi bot uchun o‘rnatish (auto-activate)
  if (draft.webhook_secret) {
    try {
      const userBot = new TgBot(token);
      const url = `${env().WEBHOOK_BASE_URL}/api/tg/${draft.id}`;
      await userBot.setWebhook(url, draft.webhook_secret);
      await sb.from("bots").update({ status: "active" }).eq("id", draft.id);
    } catch (e) {
      // Webhook tushmasa, status draft qoladi
      await sb
        .from("bots")
        .update({ status: "error" })
        .eq("id", draft.id);
      console.error(
        "[completeManagedBotCreation] webhook set failed:",
        (e as Error).message
      );
    }
  }

  // 6. Foydalanuvchini xabardor qilish
  try {
    await platform.sendMessage(
      opts.creatorTelegramId,
      `✅ Bot muvaffaqiyatli yaratildi va BotForge'ga ulandi.\n\n` +
        `<b>@${opts.newBot.username ?? "—"}</b>\n` +
        `Endi BotForge ichida sozlamalarni to‘ldiring va mijozlarga link bering.`,
      {
        reply_markup: { remove_keyboard: true },
      }
    );
  } catch {
    // Yuborib bo‘lmasa ham asosiy oqim muvaffaqiyatli
  }

  return { ok: true, bot_id: draft.id as string };
}
