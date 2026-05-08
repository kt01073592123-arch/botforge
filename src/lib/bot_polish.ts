// Bot’ning Telegram’dagi ko‘rinishini avtomatik sozlash:
// - setMyName (bot nomi)
// - setMyShortDescription (chat list’da ko‘rinadigan qisqa ta'rif)
// - setMyDescription (botni ochganda ko‘rinadigan to‘liq ta'rif)
// - setMyCommands (/menu, /booking va h.k.)
// - setChatMenuButton (Mini App tugmasi, agar pack’ga mos bo‘lsa)

import { db } from "./supabase/server";
import { TgBot } from "./telegram";
import { getBotToken } from "./bots";
import { getPack, type Pack } from "./template_packs";
import type { BotRow, BotData } from "./supabase/types";
import { env } from "./env";

const PACK_COMMANDS: Record<string, { command: string; description: string }[]> = {
  lash_studio: [
    { command: "menu", description: "Xizmatlar va narxlar" },
    { command: "booking", description: "Bron qilish" },
    { command: "contact", description: "Aloqa va manzil" },
    { command: "operator", description: "Operator bilan bog‘lanish" },
  ],
  salon_full: [
    { command: "menu", description: "Xizmatlar va narxlar" },
    { command: "booking", description: "Bron qilish" },
    { command: "contact", description: "Aloqa va manzil" },
    { command: "operator", description: "Operator bilan bog‘lanish" },
  ],
  kosmetolog: [
    { command: "consultation", description: "Bepul konsultatsiya" },
    { command: "menu", description: "Xizmatlar va narxlar" },
    { command: "contact", description: "Aloqa" },
    { command: "operator", description: "Operator" },
  ],
  restoran: [
    { command: "menu", description: "Menyuni ko‘rish" },
    { command: "delivery", description: "Yetkazib berish" },
    { command: "booking", description: "Stol bron qilish" },
    { command: "contact", description: "Manzil va telefon" },
  ],
  avto_servis: [
    { command: "services", description: "Xizmatlar" },
    { command: "diagnostics", description: "Diagnostika" },
    { command: "booking", description: "Yozilish" },
    { command: "contact", description: "Aloqa" },
  ],
  oquv_markaz: [
    { command: "courses", description: "Kurslar ro‘yxati" },
    { command: "demo", description: "Bepul demo dars" },
    { command: "pricing", description: "Narxlar va to‘lov" },
    { command: "contact", description: "Aloqa" },
  ],
};

const DEFAULT_COMMANDS = [
  { command: "start", description: "Boshidan boshlash" },
  { command: "operator", description: "Operator bilan bog‘lanish" },
];

export type PolishStatus = {
  ok: boolean;
  applied: {
    name?: boolean;
    short_description?: boolean;
    description?: boolean;
    commands?: boolean;
  };
  errors: string[];
};

function trim(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

function pickMenuText(vertical: string | null): string {
  switch (vertical) {
    case "lash":
    case "salon":
    case "kosmetolog":
      return "📋 Xizmatlar";
    case "restoran":
      return "🍽 Menyu";
    case "avto":
      return "🔧 Xizmatlar";
    case "oquv":
      return "📚 Kurslar";
    default:
      return "📋 Katalog";
  }
}

function buildShortDescription(bot: BotRow, pack: Pack | null): string {
  // Max 120 chars. Chat ro‘yxatida ko‘rinadi.
  const name = bot.business_name ?? bot.name;
  const vertical = pack?.description?.split(".")[0] ?? "AI yordamchi";
  return trim(`${name} — ${vertical}`, 120);
}

function buildDescription(bot: BotRow, pack: Pack | null, bd: BotData | null): string {
  // Max 512 chars. Bot’ni birinchi marta ochganda ko‘rinadi.
  const lines: string[] = [];
  lines.push(bot.business_name ?? bot.name);
  if (pack?.description) {
    lines.push("");
    lines.push(pack.description);
  }
  if (bd?.contacts?.phone) lines.push(`📞 ${bd.contacts.phone}`);
  if (bd?.contacts?.address) lines.push(`📍 ${bd.contacts.address}`);
  lines.push("");
  lines.push("AI administrator 24/7. Xizmatlar, narxlar, bron — Bron tugmasini bosing.");
  return trim(lines.join("\n"), 512);
}

export async function applyBotPolish(opts: {
  ownerId?: string;
  botId: string;
}): Promise<PolishStatus> {
  const sb = db();
  const status: PolishStatus = {
    ok: true,
    applied: {},
    errors: [],
  };

  // 1) Bot va data
  const { data: bot } = await sb
    .from("bots")
    .select("*")
    .eq("id", opts.botId)
    .maybeSingle();
  if (!bot) {
    return { ok: false, applied: {}, errors: ["Bot topilmadi"] };
  }
  if (opts.ownerId && bot.owner_id !== opts.ownerId) {
    return { ok: false, applied: {}, errors: ["Ruxsat yo‘q"] };
  }
  if (!bot.tg_bot_id) {
    return { ok: false, applied: {}, errors: ["Bot tokeni hali ulanmagan"] };
  }

  const { data: bdRow } = await sb
    .from("bot_data")
    .select("*")
    .eq("bot_id", opts.botId)
    .maybeSingle();
  const bd = bdRow as BotData | null;

  const pack = bot.template_id ? await getPack(bot.template_id) : null;

  // 2) Token
  let tg: TgBot;
  try {
    tg = new TgBot(await getBotToken(opts.botId));
  } catch {
    return { ok: false, applied: {}, errors: ["Bot tokenini olib bo‘lmadi"] };
  }

  // 3) setMyName (rate limit per dq mavjud — xato bo‘lsa o‘tkazib yuboramiz)
  const name = trim(bot.business_name ?? bot.name, 64);
  try {
    await tg.call("setMyName", { name });
    status.applied.name = true;
  } catch (e) {
    status.errors.push(`name: ${(e as Error).message}`);
  }

  // 4) setMyShortDescription
  try {
    await tg.call("setMyShortDescription", {
      short_description: buildShortDescription(bot as BotRow, pack),
    });
    status.applied.short_description = true;
  } catch (e) {
    status.errors.push(`short_description: ${(e as Error).message}`);
  }

  // 5) setMyDescription
  try {
    await tg.call("setMyDescription", {
      description: buildDescription(bot as BotRow, pack, bd),
    });
    status.applied.description = true;
  } catch (e) {
    status.errors.push(`description: ${(e as Error).message}`);
  }

  // 6) setMyCommands
  try {
    const cmds =
      (pack?.id && PACK_COMMANDS[pack.id]) ?? DEFAULT_COMMANDS;
    await tg.call("setMyCommands", { commands: cmds });
    status.applied.commands = true;
  } catch (e) {
    status.errors.push(`commands: ${(e as Error).message}`);
  }

  // 7) setChatMenuButton — bot’ning chat menyusi customer WebApp’ga ko‘rsatadi
  if (bot.tg_username) {
    try {
      const webAppUrl = `${env().NEXT_PUBLIC_APP_URL}/c/${bot.tg_username}`;
      await tg.call("setChatMenuButton", {
        menu_button: {
          type: "web_app",
          text: pickMenuText(pack?.vertical ?? null),
          web_app: { url: webAppUrl },
        },
      });
    } catch (e) {
      status.errors.push(`menu_button: ${(e as Error).message}`);
    }
  }

  status.ok = status.errors.length === 0;
  return status;
}

export type ShareInfo = {
  bot_username: string;
  deep_link: string;
  landing_url: string;
  qr_data_url: string; // PNG data URL
  brand_kit: Pack["brand_kit"] | null;
  business_name: string;
};

export async function buildShareInfo(opts: {
  ownerId: string;
  botId: string;
}): Promise<ShareInfo | null> {
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("*")
    .eq("id", opts.botId)
    .eq("owner_id", opts.ownerId)
    .maybeSingle();
  if (!bot || !bot.tg_username) return null;

  const pack = bot.template_id ? await getPack(bot.template_id) : null;
  const deepLink = `https://t.me/${bot.tg_username}`;
  const landingUrl = `${env().NEXT_PUBLIC_APP_URL}/b/${bot.tg_username}`;

  // QR kod — server tomonidan PNG data URL sifatida yaratamiz.
  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(deepLink, {
    margin: 2,
    width: 480,
    color: {
      // Brand ranglar bilan moslashtiramiz
      dark:
        (pack?.brand_kit as { accent_color?: string })?.accent_color ?? "#000000",
      light: "#FFFFFF",
    },
  });

  return {
    bot_username: bot.tg_username,
    deep_link: deepLink,
    landing_url: landingUrl,
    qr_data_url: qrDataUrl,
    brand_kit: pack?.brand_kit ?? null,
    business_name: bot.business_name ?? bot.name,
  };
}
