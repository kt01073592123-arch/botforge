// Instagram bio yoki boshqa manbadagi matnni Claude orqali tahlil qilib,
// xizmatlar/aloqa/FAQ ma'lumotlarini ajratib oladi.

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./ai/anthropic";
import { env } from "./env";

export type ExtractedService = {
  name: string;
  price_uzs: number | null;
  duration: string | null;
};

export type ExtractedFaq = { q: string; a: string };

export type ImportExtracted = {
  business_name: string | null;
  services: ExtractedService[];
  contacts: {
    phone: string | null;
    address: string | null;
    instagram: string | null;
  };
  working_hours_text: string | null;
  faq: ExtractedFaq[];
  notes: string | null; // AI’ning umumiy izohi (nima topdi, nima topa olmadi)
};

const SYSTEM_PROMPT = `Sen — Telegram bot uchun biznes ma'lumotlarini ajratuvchi yordamchisan.
Foydalanuvchi senga Instagram bio, post matnlari yoki biznes tavsifini beradi.

VAZIFANG: undan qat'iy JSON formatda quyidagilarni ajratib qaytarish:

{
  "business_name": string | null,
  "services": [
    { "name": string, "price_uzs": integer | null, "duration": string | null }
  ],
  "contacts": {
    "phone": string | null,
    "address": string | null,
    "instagram": string | null
  },
  "working_hours_text": string | null,
  "faq": [ { "q": string, "a": string } ],
  "notes": string | null
}

QAT'IY QOIDALAR:
1. Faqat matnda aniq ko'rsatilgan ma'lumotni ol. O'ylab topma. Yo'q bo'lsa null.
2. Narxlar UZS so'mda butun son: "200k", "200,000 so'm", "200 000" → 200000.
   Diapazon bo'lsa (200-300k) → o'rtacha (250000) yoki past chegara.
3. Telefon — faqat raqam: "+998 90 123 45 67" → "998901234567".
4. Instagram username — @ siz: "@lash_studio" → "lash_studio".
5. FAQ — faqat matnda haqiqiy savol-javob bo'lsa qo'sh, aks holda [].
6. notes — qisqa izoh: "Bio + 5 post matnidan ajratdim. Narxlar 7/9 ta xizmatga topildi."
7. JSON dan tashqari hech narsa yozma. Markdown emas, izoh emas.`;

function tryParseJson(text: string): ImportExtracted | null {
  // ```json...``` yoki { ... } ni qidirib olamiz
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ImportExtracted;
  } catch {
    // Ichidan {...} qismini qidiramiz
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as ImportExtracted;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function extractFromText(text: string): Promise<ImportExtracted> {
  const trimmed = text.trim().slice(0, 12_000); // Xavfsizlik chegarasi
  if (trimmed.length < 20) {
    throw new Error("Matn juda qisqa");
  }

  const response = await anthropic().messages.create({
    model: env().AI_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: trimmed }],
  });

  const txt = (response.content as Anthropic.ContentBlock[])
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = tryParseJson(txt);
  if (!parsed) {
    throw new Error("AI javobini parse qilib bo'lmadi. Boshqa matn bilan urinib ko'ring.");
  }

  // Asosiy maydonlarni normalize qilish
  return {
    business_name: parsed.business_name ?? null,
    services: Array.isArray(parsed.services)
      ? parsed.services.map((s) => ({
          name: String(s.name ?? "").trim(),
          price_uzs:
            typeof s.price_uzs === "number" && s.price_uzs > 0
              ? Math.round(s.price_uzs)
              : null,
          duration: s.duration ? String(s.duration).trim() : null,
        })).filter((s) => s.name.length > 0)
      : [],
    contacts: {
      phone: parsed.contacts?.phone ?? null,
      address: parsed.contacts?.address ?? null,
      instagram: parsed.contacts?.instagram ?? null,
    },
    working_hours_text: parsed.working_hours_text ?? null,
    faq: Array.isArray(parsed.faq)
      ? parsed.faq
          .filter((f) => f.q && f.a)
          .map((f) => ({ q: String(f.q).trim(), a: String(f.a).trim() }))
      : [],
    notes: parsed.notes ?? null,
  };
}

// Instagram URL'idan og: meta ma'lumotni best-effort olish.
// Ko'p hollarda ishlamaydi (Meta scraping bloklaydi), lekin urinib ko'rsa zarari yo'q.
export async function fetchInstagramOg(handle: string): Promise<string | null> {
  const username = handle
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/.*$/, "")
    .trim();
  if (!username || !/^[a-zA-Z0-9._]+$/.test(username)) return null;

  const url = `https://www.instagram.com/${username}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // og:description va og:title ni qidiramiz
    const grab = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const m = html.match(re);
      return m?.[1] ?? null;
    };
    const desc = grab("og:description");
    const title = grab("og:title");
    if (!desc && !title) return null;
    return [title, desc].filter(Boolean).join("\n");
  } catch {
    return null;
  }
}

// Apply qilish — bot_data ga yozish (mavjud ma'lumot ustiga)
export type ApplyOptions = {
  business_name?: boolean;
  services?: boolean;
  contacts?: boolean;
  faq?: boolean;
};

export function buildBotDataPatch(
  extracted: ImportExtracted,
  opts: ApplyOptions = {
    business_name: true,
    services: true,
    contacts: true,
    faq: true,
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bot: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (opts.business_name && extracted.business_name) {
    bot.business_name = extracted.business_name;
  }

  if (opts.services && extracted.services.length > 0) {
    data.services = extracted.services.map((s) => ({
      name: s.name,
      price: s.price_uzs
        ? `${s.price_uzs.toLocaleString("uz-UZ")} so‘m`
        : "Narxni kiriting",
      duration: s.duration ?? undefined,
    }));
  }

  if (opts.contacts) {
    const c: Record<string, string> = {};
    if (extracted.contacts.phone) c.phone = extracted.contacts.phone;
    if (extracted.contacts.address) c.address = extracted.contacts.address;
    if (extracted.contacts.instagram) c.instagram = extracted.contacts.instagram;
    if (Object.keys(c).length > 0) data.contacts = c;
  }

  if (opts.faq && extracted.faq.length > 0) {
    data.faq = extracted.faq;
  }

  return { bot, data };
}
