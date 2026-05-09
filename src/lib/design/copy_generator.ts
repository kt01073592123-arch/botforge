// AI Copy Generator — biznes uchun hero/USP/about/testimonial matnlarini yaratadi.
// Brand voice (luxury/playful/tech/...) ga moslab tilini tanlaydi.
// Til: Uzbek default, Rus va English variantlari ham mumkin.

import { anthropic } from "../ai/anthropic";
import { env } from "../env";
import type { BrandKit } from "./brand_generator";

export type SiteCopy = {
  hero_headline: string;
  hero_subheadline: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  usp_items: Array<{ icon: string; title: string; description: string }>;
  about_text: string;
  testimonial_seeds: Array<{ name: string; text: string; rating: number }>;
};

export type CopyInput = {
  businessName: string;
  businessType?: string;
  description?: string;
  vertical?: string;
  brandVoice?: BrandKit["brand_voice"];
  language?: "uz" | "ru" | "en";
  emojiSet?: string[];
};

const VOICE_HINTS: Record<NonNullable<CopyInput["brandVoice"]>, string> = {
  professional: "Aniq, ishonchli, marketing klishe'larsiz. Konsalting yoki B2B sektorga mos.",
  friendly: "Iliq, hamkorona, 'siz' o'rniga 'sen' (uz) yoki 'ty' (ru) qo'llashi mumkin.",
  luxury: "Premium, refined, hech qanday emoji'siz, sifat va estetikani ta'kidlash.",
  playful: "Energetik, hazil, emoji'lar bilan, kim eshitsa kulishi yoki tabassum qilishi.",
  tech: "Aniq, faktik, raqamlar va data, modernizm urg'usi.",
};

const LANG_HINTS: Record<NonNullable<CopyInput["language"]>, string> = {
  uz: "Uzbek tilida (lotin yozuvi).",
  ru: "Rus tilida (kirill).",
  en: "English language.",
};

function buildPrompt(input: CopyInput): string {
  const voice = input.brandVoice ?? "friendly";
  const lang = input.language ?? "uz";
  const emojiHint = input.emojiSet?.length
    ? `Emoji to'plami (kerak bo'lsa USP icon sifatida ishlat): ${input.emojiSet.join(" ")}`
    : "Emoji ehtiyojga qarab tanla.";

  return `Sen yuqori toifali copywriter va landing page conversion specialist'san. Berilgan biznes uchun konversiya uchun optimallashtirilgan, samimiy va aniq matnlar yaratasan.

KIRISH:
Biznes nomi: ${input.businessName}
Biznes turi: ${input.businessType ?? "—"}
Vertikal: ${input.vertical ?? "service"}
Tavsif: ${input.description ?? "—"}
Brand voice: ${voice} — ${VOICE_HINTS[voice]}
Til: ${LANG_HINTS[lang]}
${emojiHint}

QOIDALAR:
1. hero_headline — 4-8 so'z, eng katta benefit'ni urg'ulash. Klishe ("eng yaxshi", "sifatli xizmat") TAQIQLANGAN.
2. hero_subheadline — 15-25 so'z, asosiy USP'ni aniq ifoda etish.
3. hero_cta_primary — 2-3 so'z, harakat fe'li. ("Bron qilish", "Hozir buyurtma berish")
4. hero_cta_secondary — 2-3 so'z, kichik harakat. ("Batafsil", "Menyu ko'rish")
5. usp_items — 3 ta. Har biri: icon (emoji), title (3-5 so'z), description (10-15 so'z). Faktik, aniq.
6. about_text — 50-80 so'z, biznesning shaxsiyatini va missiyasini ko'rsat.
7. testimonial_seeds — 3 ta soxta lekin real ko'rinadigan testimonial. Har biri: name (mahalliy ism), text (15-25 so'z), rating (4 yoki 5). NOTE: Bot egasi keyin real testimonial bilan almashtiradi.

Faqat JSON qaytar:
{
  "hero_headline": "...",
  "hero_subheadline": "...",
  "hero_cta_primary": "...",
  "hero_cta_secondary": "...",
  "usp_items": [
    {"icon": "🎯", "title": "...", "description": "..."},
    {"icon": "⚡", "title": "...", "description": "..."},
    {"icon": "💎", "title": "...", "description": "..."}
  ],
  "about_text": "...",
  "testimonial_seeds": [
    {"name": "...", "text": "...", "rating": 5},
    {"name": "...", "text": "...", "rating": 5},
    {"name": "...", "text": "...", "rating": 4}
  ]
}`;
}

const FALLBACK: SiteCopy = {
  hero_headline: "Biznesingizga zamonaviy yondashuv",
  hero_subheadline: "Mijozlar uchun qulay, sifatli va tezkor xizmat. Bugundan boshlang.",
  hero_cta_primary: "Boshlash",
  hero_cta_secondary: "Batafsil",
  usp_items: [
    { icon: "⚡", title: "Tezkor xizmat", description: "Vaqtingizni tejaymiz va sifatga e'tibor qaratamiz." },
    { icon: "🎯", title: "Aniq natija", description: "Har bir mijoz uchun shaxsiy yondashuv." },
    { icon: "💎", title: "Premium sifat", description: "Faqat eng yaxshi materiallar va malakali jamoa." },
  ],
  about_text:
    "Biz mijozlarimizga eng yuqori sifat va shaxsiy yondashuvni taklif etamiz. Tajribamiz va zamonaviy yondashuv biznesingizni yangi bosqichga olib chiqadi.",
  testimonial_seeds: [
    { name: "Aziz Karimov", text: "Hayratlanarli! Tezkor xizmat va aniq natijalar. Tavsiya qilaman.", rating: 5 },
    { name: "Madina Yusupova", text: "Sifat va qulaylikni topdim. Yana keladigan mijozman.", rating: 5 },
    { name: "Sherzod O'rolov", text: "Yondashuv professional, narxlar adolatli.", rating: 4 },
  ],
};

export async function generateSiteCopy(input: CopyInput): Promise<{
  copy: SiteCopy;
  cost_usd: number;
  duration_ms: number;
}> {
  const start = Date.now();
  const prompt = buildPrompt(input);

  const response = await anthropic().messages.create({
    model: env().AI_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let parsed: Partial<SiteCopy> = {};
  try {
    const json = rawText.match(/\{[\s\S]*\}/);
    if (json) parsed = JSON.parse(json[0]) as Partial<SiteCopy>;
  } catch {
    // fallback
  }

  // Validatsiya
  const copy: SiteCopy = {
    hero_headline: stringOr(parsed.hero_headline, FALLBACK.hero_headline, 120),
    hero_subheadline: stringOr(parsed.hero_subheadline, FALLBACK.hero_subheadline, 240),
    hero_cta_primary: stringOr(parsed.hero_cta_primary, FALLBACK.hero_cta_primary, 40),
    hero_cta_secondary: stringOr(parsed.hero_cta_secondary, FALLBACK.hero_cta_secondary, 40),
    usp_items:
      Array.isArray(parsed.usp_items) && parsed.usp_items.length > 0
        ? parsed.usp_items.slice(0, 4).map((u) => ({
            icon: stringOr(u?.icon, "✨", 4),
            title: stringOr(u?.title, "—", 80),
            description: stringOr(u?.description, "—", 200),
          }))
        : FALLBACK.usp_items,
    about_text: stringOr(parsed.about_text, FALLBACK.about_text, 1000),
    testimonial_seeds:
      Array.isArray(parsed.testimonial_seeds) && parsed.testimonial_seeds.length > 0
        ? parsed.testimonial_seeds.slice(0, 4).map((t) => ({
            name: stringOr(t?.name, "Mijoz", 80),
            text: stringOr(t?.text, "Yaxshi", 400),
            rating: typeof t?.rating === "number" && t.rating >= 1 && t.rating <= 5 ? Math.round(t.rating) : 5,
          }))
        : FALLBACK.testimonial_seeds,
  };

  const cost_usd =
    response.usage.input_tokens * (1 / 1_000_000) +
    response.usage.output_tokens * (5 / 1_000_000);

  return {
    copy,
    cost_usd,
    duration_ms: Date.now() - start,
  };
}

function stringOr(v: unknown, fallback: string, maxLen: number): string {
  if (typeof v !== "string" || !v.trim()) return fallback;
  return v.trim().slice(0, maxLen);
}
