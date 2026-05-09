// AI Prompt → Bot Config generator.
// Foydalanuvchi tabiiy tilda biznesini tasvirlaydi ("kosmetika do'koni, Toshkent, premium ranglar"),
// Claude esa BeautyShop pattern'ini sklet qilib oluib bot uchun to'liq config qaytaradi.
//
// Sklet manbai: BeautyShop (Seoul Beauty Shop) — Mini App + AI consultant + referral cashback.
// Generator natijasi: pack-shaped JSON (welcome, system_prompt, services, faq, brand_kit, ...)
// — bu shu zahoti createBot() funksiyasiga uzatilishi mumkin.

import { anthropic } from "./anthropic";
import { env } from "../env";
import type {
  Service,
  FaqItem,
  WorkingHours,
  Broadcast,
  BrandKit,
} from "../template_packs";

export type BotPromptInput = {
  /** Foydalanuvchining erkin matn promt'i: "kosmetika do'koni, Toshkent..." */
  prompt: string;
  /** Ixtiyoriy: bot nomi (UI dan) */
  botName?: string;
  /** Ixtiyoriy: biznes nomi (UI dan) */
  businessName?: string;
  /** Ixtiyoriy: vertical hint — agar foydalanuvchi tanlagan bo'lsa */
  verticalHint?: "shop" | "salon" | "restaurant" | "course" | "service";
  /** Ixtiyoriy: til (default uz) */
  language?: "uz" | "ru" | "en";
};

export type GeneratedBotConfig = {
  // Identifikatorlar
  vertical: "shop" | "salon" | "restaurant" | "course" | "service";
  business_type: string; // "Kosmetika do'koni", "Pitsa restorani", ...
  // System prompt + welcome
  system_prompt: string;
  welcome_message: string;
  // Tugmalar (BeautyShop skeleti: Mini App / AI / Taklif / Aloqa / To'lov)
  buttons: { text: string }[];
  // Mahsulot/xizmatlar (BeautyShop'da products edi)
  services: Service[];
  // FAQ
  faq: FaqItem[];
  // Ish vaqti
  working_hours: WorkingHours;
  // Aloqa
  contacts: { phone?: string; address?: string; instagram?: string };
  // Broadcasts (3 ta namuna)
  sample_broadcasts: Broadcast[];
  // Brand kit
  brand_kit: BrandKit;
  // Meta
  reasoning: string; // qisqa izoh: nima uchun shunday tanlandi
};

// ============================================================
// SKLET — BeautyShop "namuna" — har generatsiyada modelga ko'rsatamiz
// ============================================================
const SKELETON_REFERENCE = `=== SKLET (NAMUNA): SeoulBeautyShop ===

Bu real ishlayotgan Telegram bot + Mini App pattern'i:

1) Bot xabarlari:
   - /start → "Assalomu alaykum {ism}! SeoulBeautyShop'ga xush kelibsiz. Biz bilan hozirda {N} ta mijoz birga!"
   - Reply keyboard: "🛒 Do'kon (Mini App)", "🤖 AI Maslahat", "🔗 Do'stni taklif qilish", "📞 Sotuvchi bilan aloqa", "💳 To'lov"
   - Mini App tugmasi user_id va name'ni URL'ga uzatadi.
   - Admin photo + caption ("Nomi | Kategoriya | Ta'rif | Narx") → mahsulot DB'ga qo'shiladi.

2) AI consultant qoidalari:
   - Sen kosmetolog/sotuv-maslahatchisan
   - Mijoz muammosi (teri/yuz/soch) bo'yicha avval ilmiy qisqa maslahat
   - Keyin do'kon mahsulotlaridan 1-2 ta mos mahsulotni tavsiya qil (narx bilan)
   - Markdown belgilarni ishlatma
   - Faqat o'zbek tilida

3) Referral / cashback:
   - "Do'stni taklif qilish" → unique link
   - Yetkazilgan order'dan: 2% master'ga, 2% buyer'ning bonusiga

4) Brand: pink-peach (#FF8FA3 → #FFD7D7), font Playfair + Inter

=== SKLETNI YANGI BIZNESGA MOSLASH QOIDALARI ===

Generator bu skletni yangi biznesga ko'chiradi:
- "🛒 Do'kon" tugmasi → biznesga mos: pizza uchun "📋 Menyu", salon uchun "📅 Yozilish",
  kurs uchun "📚 Darslar"
- AI prompt — mutaxassis turi biznesga mos (kosmetolog → oshpaz/usta/o'qituvchi/...)
- Services ro'yxati biznesga mos 4-8 ta real mahsulot/xizmat
- Brand kit ranglari biznes mood'iga mos
- FAQ 4-6 ta real savol-javob
- Referral va admin photo upload pattern saqlanadi`;

// ============================================================
// SYSTEM PROMPT — Generator
// ============================================================
const SYSTEM_PROMPT = `Sen BotForge platformasi uchun professional bot konfigurator-arxitektorisan.
Foydalanuvchi tabiiy tilda biznesini tasvirlaydi, sen esa real, ishlatishga tayyor Telegram bot config'ini JSON formatda qaytarasan.

${SKELETON_REFERENCE}

=== JSON OUTPUT FORMAT (qattiq talab) ===

{
  "vertical": "shop|salon|restaurant|course|service",
  "business_type": "qisqa biznes turi nomi",
  "system_prompt": "to'liq, batafsil, 8-15 qator system prompt — AI ning rolini, qoidalarini, biznes ohangini batafsil tasvirlaydi",
  "welcome_message": "1-2 jumla salomlashish, bot/biznes nomi bilan",
  "buttons": [
    {"text":"🛒 emoji + label"},
    ...4-6 ta tugma
  ],
  "services": [
    {"name":"Mahsulot/xizmat nomi","base_price_uzs":50000,"duration":"100ml yoki 30 daq"}
    ...4-8 ta
  ],
  "faq": [
    {"q":"savol","a":"javob 1-3 jumla"}
    ...4-6 ta
  ],
  "working_hours": {
    "mon":[10,20],"tue":[10,20],"wed":[10,20],"thu":[10,20],
    "fri":[10,20],"sat":[10,18],"sun":null
  },
  "contacts": {"phone":"+998...","address":"shahar, tuman","instagram":"@nomi"},
  "sample_broadcasts": [
    {"title":"...","text":"...","suggested_segment":"all|leads|converted|no_lead"}
    ...3 ta
  ],
  "brand_kit": {
    "primary_color":"#hex",
    "accent_color":"#hex",
    "background_tint":"#hex",
    "text_on_primary":"#FFFFFF yoki #000000",
    "emoji_set":["...","...","...","...","..."],
    "font_hint":"Heading + Body",
    "gradient":"linear-gradient(135deg, #hex 0%, #hex 50%, #hex 100%)"
  },
  "reasoning": "1-2 jumla: nega shu ranglar va shu services tanlandi"
}

=== QOIDALAR ===
1. Faqat valid JSON qaytar. Hech qanday boshqa matn YO'Q (no \`\`\`json\`\`\` ham).
2. Hamma matn O'ZBEK TILIDA bo'lsin (system_prompt ham).
3. Narxlar real, biznesga mos: pitsa 35 000-90 000, kosmetika 50 000-300 000, kurs 500 000-3 000 000.
4. Brand kit ranglari WCAG kontrast bo'lishi kerak (#FFF text uchun primary qora bo'lmasin).
5. Buttons 4-6 ta. Birinchisi har doim Mini App / asosiy harakat (Menyu / Bron / Do'kon).
6. system_prompt 1000 belgidan oshmasin lekin batafsil bo'lsin.
7. FAQ savollari real mijoz savollari (yetkazib berish, to'lov, kafolat, ish vaqti).`;

// ============================================================
// FALLBACK config — agar Claude xato qaytarsa
// ============================================================
function fallbackConfig(input: BotPromptInput): GeneratedBotConfig {
  return {
    vertical: input.verticalHint ?? "service",
    business_type: input.businessName ?? "Biznes",
    system_prompt: `Sen — ${input.businessName ?? "kompaniya"}ning iliq, professional AI yordamchisisan. Mijoz savollariga aniq, qisqa va do'stona javob ber. Faqat berilgan ma'lumotlardan foydalan, o'ylab topma. O'zbek tilida muloqot qil.`,
    welcome_message: `Assalomu alaykum! 👋 ${input.businessName ?? "Bizning"} botga xush kelibsiz. Sizga qanday yordam bera olamiz?`,
    buttons: [
      { text: "ℹ️ Ma'lumot" },
      { text: "📞 Aloqa" },
      { text: "🕒 Ish vaqti" },
      { text: "💬 Operator" },
    ],
    services: [],
    faq: [
      { q: "Qanday bog'lanish mumkin?", a: "Telefon raqamimiz orqali yoki shu botda yozing — operator bog'lanadi." },
      { q: "Ish vaqtingiz qanday?", a: "Dushanbadan shanbagacha 10:00–20:00." },
    ],
    working_hours: {
      mon: [10, 20], tue: [10, 20], wed: [10, 20], thu: [10, 20],
      fri: [10, 20], sat: [10, 18], sun: null,
    },
    contacts: {},
    sample_broadcasts: [
      { title: "Salom", text: "Salom! Sizni ko'rganimizdan xursandmiz.", suggested_segment: "all" },
    ],
    brand_kit: {
      primary_color: "#7c5cff",
      accent_color: "#19c37d",
      background_tint: "#F8FAFC",
      text_on_primary: "#FFFFFF",
      emoji_set: ["✨", "🚀", "💼", "📈", "🎯"],
      font_hint: "Inter + Inter",
      gradient: "linear-gradient(135deg, #7c5cff 0%, #19c37d 100%)",
    },
    reasoning: "Fallback: Claude generatsiya muvaffaqiyatsiz tugadi, default config ishlatildi.",
  };
}

// ============================================================
// VALIDATSIYA helperlari
// ============================================================
function isHex(s: unknown): s is string {
  return typeof s === "string" && /^#[0-9A-Fa-f]{6}$/.test(s);
}

function pickStr(v: unknown, fallback: string, max = 4000): string {
  if (typeof v === "string" && v.trim().length > 0) return v.slice(0, max);
  return fallback;
}

function pickArr<T>(v: unknown, max = 20): T[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max) as T[];
}

function pickVertical(v: unknown): GeneratedBotConfig["vertical"] {
  const allowed = ["shop", "salon", "restaurant", "course", "service"] as const;
  if (allowed.includes(v as (typeof allowed)[number])) {
    return v as GeneratedBotConfig["vertical"];
  }
  return "service";
}

function normalizeServices(arr: unknown): Service[] {
  const out: Service[] = [];
  for (const s of pickArr<Record<string, unknown>>(arr, 12)) {
    const name = pickStr(s.name, "");
    const price = Number(s.base_price_uzs ?? 0);
    if (!name || !Number.isFinite(price) || price < 0) continue;
    const item: Service = { name, base_price_uzs: Math.round(price) };
    if (typeof s.duration === "string") item.duration = s.duration;
    out.push(item);
  }
  return out;
}

function normalizeFaq(arr: unknown): FaqItem[] {
  return pickArr<Record<string, unknown>>(arr, 10)
    .map((f) => {
      const q = pickStr(f.q, "", 200);
      const a = pickStr(f.a, "", 800);
      if (!q || !a) return null;
      return { q, a };
    })
    .filter((x): x is FaqItem => x !== null);
}

function normalizeWorkingHours(v: unknown): WorkingHours {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const out: WorkingHours = {};
  const obj = (v ?? {}) as Record<string, unknown>;
  for (const d of days) {
    const val = obj[d];
    if (val === null) {
      out[d] = null;
    } else if (Array.isArray(val) && val.length === 2 && val.every((n) => typeof n === "number")) {
      out[d] = [val[0] as number, val[1] as number];
    } else {
      out[d] = null;
    }
  }
  return out;
}

function normalizeBroadcasts(arr: unknown): Broadcast[] {
  const allowedSeg = ["all", "leads", "converted", "no_lead"] as const;
  return pickArr<Record<string, unknown>>(arr, 5)
    .map((b) => {
      const title = pickStr(b.title, "", 120);
      const text = pickStr(b.text, "", 400);
      const seg = allowedSeg.includes(b.suggested_segment as (typeof allowedSeg)[number])
        ? (b.suggested_segment as Broadcast["suggested_segment"])
        : "all";
      if (!title || !text) return null;
      return { title, text, suggested_segment: seg };
    })
    .filter((x): x is Broadcast => x !== null);
}

function normalizeBrandKit(v: unknown): BrandKit {
  const k = (v ?? {}) as Record<string, unknown>;
  return {
    primary_color: isHex(k.primary_color) ? k.primary_color : "#7c5cff",
    accent_color: isHex(k.accent_color) ? k.accent_color : "#19c37d",
    background_tint: isHex(k.background_tint) ? k.background_tint : "#F8FAFC",
    text_on_primary: isHex(k.text_on_primary) ? k.text_on_primary : "#FFFFFF",
    emoji_set:
      Array.isArray(k.emoji_set) && k.emoji_set.length > 0
        ? (k.emoji_set as unknown[]).filter((x) => typeof x === "string").slice(0, 8) as string[]
        : ["✨", "🚀", "💼"],
    font_hint: pickStr(k.font_hint, "Inter + Inter", 80),
    gradient: pickStr(
      k.gradient,
      "linear-gradient(135deg, #7c5cff 0%, #19c37d 100%)",
      200,
    ),
  };
}

function normalizeButtons(v: unknown): { text: string }[] {
  return pickArr<Record<string, unknown>>(v, 8)
    .map((b) => {
      const text = pickStr(b.text, "", 64);
      if (!text) return null;
      return { text };
    })
    .filter((x): x is { text: string } => x !== null);
}

// ============================================================
// MAIN — generateBotFromPrompt
// ============================================================
export async function generateBotFromPrompt(input: BotPromptInput): Promise<{
  config: GeneratedBotConfig;
  cost_usd: number;
  duration_ms: number;
  tokens_input: number;
  tokens_output: number;
  raw_text: string;
}> {
  const start = Date.now();
  const trimmedPrompt = (input.prompt ?? "").trim();
  if (trimmedPrompt.length < 10) {
    throw new Error("Promtni kamida 10 ta belgida yozing (masalan: 'kosmetika do'koni Toshkentda, premium ranglar')");
  }
  if (trimmedPrompt.length > 2000) {
    throw new Error("Promt 2000 belgidan oshmasligi kerak");
  }

  const userPrompt = `Foydalanuvchi promt'i:
"""
${trimmedPrompt}
"""

Qo'shimcha kontekst:
- Bot nomi: ${input.botName ?? "—"}
- Biznes nomi: ${input.businessName ?? "—"}
- Vertical hint: ${input.verticalHint ?? "—"}
- Til: ${input.language ?? "uz"}

Faqat valid JSON qaytar (no markdown, no explanation).`;

  let response;
  try {
    response = await anthropic().messages.create({
      model: env().AI_MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (e) {
    // API xatosi — fallback qaytaramiz, lekin xatoni log qilamiz
    console.error("[bot_generator] anthropic error:", e);
    return {
      config: fallbackConfig(input),
      cost_usd: 0,
      duration_ms: Date.now() - start,
      tokens_input: 0,
      tokens_output: 0,
      raw_text: "",
    };
  }

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // JSON ni topib parse qilish (Claude ba'zan ```json``` bilan o'rab beradi)
  let parsed: Record<string, unknown> = {};
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch (e) {
    console.error("[bot_generator] JSON parse error:", e, "raw:", rawText.slice(0, 200));
  }

  const fb = fallbackConfig(input);

  const config: GeneratedBotConfig = {
    vertical: pickVertical(parsed.vertical ?? input.verticalHint),
    business_type: pickStr(parsed.business_type, fb.business_type, 200),
    system_prompt: pickStr(parsed.system_prompt, fb.system_prompt, 2000),
    welcome_message: pickStr(parsed.welcome_message, fb.welcome_message, 600),
    buttons: normalizeButtons(parsed.buttons).length > 0 ? normalizeButtons(parsed.buttons) : fb.buttons,
    services: normalizeServices(parsed.services),
    faq: normalizeFaq(parsed.faq).length > 0 ? normalizeFaq(parsed.faq) : fb.faq,
    working_hours: normalizeWorkingHours(parsed.working_hours),
    contacts: (typeof parsed.contacts === "object" && parsed.contacts !== null
      ? parsed.contacts
      : {}) as { phone?: string; address?: string; instagram?: string },
    sample_broadcasts:
      normalizeBroadcasts(parsed.sample_broadcasts).length > 0
        ? normalizeBroadcasts(parsed.sample_broadcasts)
        : fb.sample_broadcasts,
    brand_kit: normalizeBrandKit(parsed.brand_kit),
    reasoning: pickStr(parsed.reasoning, "AI tomonidan generatsiya qilindi.", 400),
  };

  // Narx hisoblash — Claude opus uchun taxminiy ($3/$15 per 1M tokens)
  const cost_usd =
    response.usage.input_tokens * (3 / 1_000_000) +
    response.usage.output_tokens * (15 / 1_000_000);

  return {
    config,
    cost_usd,
    duration_ms: Date.now() - start,
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    raw_text: rawText,
  };
}
