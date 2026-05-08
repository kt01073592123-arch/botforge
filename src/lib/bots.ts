// Bot CRUD va token boshqaruv helperlari. Hammasi `owner_id` bilan tekshirilgan.

import { randomBytes } from "node:crypto";
import { db } from "./supabase/server";
import { encryptToken, decryptToken, maskToken } from "./encryption";
import { TgBot, TelegramApiError } from "./telegram";
import { env } from "./env";
import { canCreateBot } from "./billing";
import { resolveConfig, getPack, type WizardChoices } from "./template_packs";
import type { BotRow, BotData, BotTemplateRow } from "./supabase/types";

export async function listBots(ownerId: string): Promise<BotRow[]> {
  const { data, error } = await db()
    .from("bots")
    .select("*")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BotRow[];
}

export async function getBot(ownerId: string, id: string): Promise<BotRow | null> {
  const { data } = await db()
    .from("bots")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as BotRow) ?? null;
}

export async function listTemplates(): Promise<BotTemplateRow[]> {
  const { data, error } = await db()
    .from("bot_templates")
    .select("*")
    .eq("is_active", true)
    .order("category");
  if (error) throw new Error(error.message);
  return (data ?? []) as BotTemplateRow[];
}

export async function createBot(opts: {
  ownerId: string;
  templateId: string;
  name: string;
  businessName?: string;
  language?: string;
  // Wizard tanlovlari (pack uchun)
  subTypeId?: string;
  tierId?: string;
  toneId?: string;
}): Promise<BotRow> {
  const sb = db();

  // Plan limit
  const ok = await canCreateBot(opts.ownerId);
  if (!ok) {
    throw new Error("Tarif limiti tugadi. Tarifni yangilang yoki keraksiz botni o‘chiring.");
  }

  // getPack() jsonb maydonlarni normalize qiladi — to‘g‘ridan-to‘g‘ri sb.from()
  // raw string qaytaradi, bu resolveConfig.find() ni buzadi.
  const pack = await getPack(opts.templateId);
  if (!pack) throw new Error("Template topilmadi");

  const choices: WizardChoices = {
    sub_type_id: opts.subTypeId,
    tier_id: opts.tierId,
    tone_id: opts.toneId,
  };
  const resolved = pack.is_pack
    ? resolveConfig(pack, choices)
    : {
        system_prompt: pack.default_system_prompt,
        welcome_message: pack.default_welcome,
        buttons: pack.default_buttons,
        services: [],
        faq: [],
        working_hours: {},
        contacts: {},
        business_type: null,
      };

  const { data, error } = await sb
    .from("bots")
    .insert({
      owner_id: opts.ownerId,
      template_id: opts.templateId,
      name: opts.name,
      business_name: opts.businessName ?? null,
      business_type: resolved.business_type,
      language: opts.language ?? "uz",
      status: "draft",
      ai_model: env().AI_MODEL,
      system_prompt: resolved.system_prompt,
      welcome_message: resolved.welcome_message,
      webhook_secret: randomBytes(24).toString("hex"),
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create failed");

  // bot_data ga packdan ko‘chirilgan ma’lumot
  await sb.from("bot_data").insert({
    bot_id: data.id,
    services: resolved.services,
    faq: resolved.faq,
    working_hours: resolved.working_hours,
    contacts: resolved.contacts,
  });

  return data as BotRow;
}

export async function setBotToken(opts: {
  ownerId: string;
  botId: string;
  token: string;
}): Promise<{ tg_bot_id: number; tg_username: string; tg_first_name: string }> {
  // 1. validate
  const bot = new TgBot(opts.token);
  let me;
  try {
    me = await bot.getMe();
  } catch (e) {
    if (e instanceof TelegramApiError) {
      throw new Error(`Token noto‘g‘ri: ${e.message}`);
    }
    throw e;
  }

  const sb = db();

  // 2. uniqueness — boshqa egasi shu botni ulagan bo‘lmasin
  const { data: existing } = await sb
    .from("bots")
    .select("id, owner_id")
    .eq("tg_bot_id", me.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing && existing.id !== opts.botId) {
    throw new Error("Bu bot allaqachon boshqa loyihada ulangan");
  }

  // 3. ownership check
  const owned = await getBot(opts.ownerId, opts.botId);
  if (!owned) throw new Error("Bot topilmadi");

  // 4. encrypt + save
  const enc = encryptToken(opts.token);
  await sb.from("bot_secrets").upsert({
    bot_id: opts.botId,
    encrypted_token: enc.encrypted,
    iv: enc.iv,
    auth_tag: enc.authTag,
    rotated_at: new Date().toISOString(),
  });

  await sb
    .from("bots")
    .update({
      tg_bot_id: me.id,
      tg_username: me.username ?? null,
      tg_first_name: me.first_name,
    })
    .eq("id", opts.botId);

  return {
    tg_bot_id: me.id,
    tg_username: me.username ?? "",
    tg_first_name: me.first_name,
  };
}

export async function getBotToken(botId: string): Promise<string> {
  const { data, error } = await db()
    .from("bot_secrets")
    .select("encrypted_token, iv, auth_tag")
    .eq("bot_id", botId)
    .single();
  if (error || !data) throw new Error("Bot tokeni topilmadi");
  return decryptToken({
    encrypted: data.encrypted_token,
    iv: data.iv,
    authTag: data.auth_tag,
  });
}

export async function activateBot(opts: { ownerId: string; botId: string }) {
  const bot = await getBot(opts.ownerId, opts.botId);
  if (!bot) throw new Error("Bot topilmadi");
  if (!bot.tg_bot_id) throw new Error("Avval token ulang");
  if (!bot.webhook_secret) throw new Error("Webhook secret yo‘q");

  const token = await getBotToken(opts.botId);
  const tg = new TgBot(token);

  const url = `${env().WEBHOOK_BASE_URL}/api/tg/${opts.botId}`;
  await tg.setWebhook(url, bot.webhook_secret);

  await db().from("bots").update({ status: "active" }).eq("id", opts.botId);

  // Auto-polish brendlash
  try {
    const { applyBotPolish } = await import("./bot_polish");
    await applyBotPolish({ ownerId: opts.ownerId, botId: opts.botId });
  } catch {}
}

export async function pauseBot(opts: { ownerId: string; botId: string }) {
  const bot = await getBot(opts.ownerId, opts.botId);
  if (!bot) throw new Error("Bot topilmadi");
  if (bot.tg_bot_id) {
    try {
      const token = await getBotToken(opts.botId);
      await new TgBot(token).deleteWebhook();
    } catch { /* tokenga ulana olmasak ham status pause */ }
  }
  await db().from("bots").update({ status: "paused" }).eq("id", opts.botId);
}

export async function softDeleteBot(opts: { ownerId: string; botId: string }) {
  const bot = await getBot(opts.ownerId, opts.botId);
  if (!bot) return;
  try {
    const token = await getBotToken(opts.botId);
    await new TgBot(token).deleteWebhook();
  } catch {}
  await db()
    .from("bots")
    .update({ status: "paused", deleted_at: new Date().toISOString() })
    .eq("id", opts.botId);
}

export async function getBotData(botId: string): Promise<BotData | null> {
  const { data } = await db().from("bot_data").select("*").eq("bot_id", botId).maybeSingle();
  return (data as BotData) ?? null;
}

export async function updateBotData(botId: string, patch: Partial<BotData>) {
  await db()
    .from("bot_data")
    .upsert({ bot_id: botId, ...patch });
}

export async function maskedToken(botId: string): Promise<string | null> {
  try {
    return maskToken(await getBotToken(botId));
  } catch {
    return null;
  }
}
