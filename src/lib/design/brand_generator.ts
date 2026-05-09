// AI Brand Generator — biznes ma'lumotidan brand kit yaratish.
// Claude'ga biznes nomi, tipi va mood beriladi → 5-8 ta rang, font pair, emoji to'plami,
// brand voice, mood keywords qaytaradi.
//
// Misol natija (ColorScheme):
//   {
//     primary_color: "#FF5A1F",
//     accent_color: "#0EA5E9",
//     background_color: "#FAFAF7",
//     ...
//     emoji_set: ["💇", "✨", "💄"],
//     font_heading: "Playfair Display",
//     font_body: "Inter",
//     brand_voice: "luxury",
//     mood_keywords: ["elegant", "warm", "premium"]
//   }

import { anthropic } from "../ai/anthropic";
import { env } from "../env";

export type BrandKit = {
  primary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  text_muted_color: string;
  gradient_from: string;
  gradient_to: string;
  font_heading: string;
  font_body: string;
  emoji_set: string[];
  logo_emoji: string;
  brand_voice: "professional" | "friendly" | "luxury" | "playful" | "tech";
  mood_keywords: string[];
  template_id: "restaurant" | "salon" | "shop" | "course" | "service";
};

export type BrandInput = {
  businessName: string;
  businessType?: string;        // "Beauty salon", "Restaurant", ...
  vertical?: string;             // 'restaurant' | 'salon' | 'shop' | 'course' | 'service'
  description?: string;
  targetAudience?: string;
  preferredMood?: string;        // 'minimalist' | 'warm' | 'energetic' | 'luxury'
};

const SAFE_FONTS_HEADING = [
  "Inter", "Playfair Display", "Montserrat", "Poppins", "DM Serif Display",
  "Cormorant Garamond", "Space Grotesk", "Bricolage Grotesque", "Outfit",
];
const SAFE_FONTS_BODY = ["Inter", "DM Sans", "Manrope", "Plus Jakarta Sans", "Lato"];

function isHexColor(s: unknown): s is string {
  return typeof s === "string" && /^#[0-9A-Fa-f]{6}$/.test(s);
}

function pickFont(value: unknown, list: string[], fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (list.includes(value)) return value;
  return fallback;
}

function clampList(arr: unknown, max = 8): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => typeof x === "string" && x.length <= 64).slice(0, max);
}

const SYSTEM_PROMPT = `Sen yuqori toifali brand designer va art director'san. Berilgan biznes uchun professional, zamonaviy va biznes turiga aniq mos rang sxemasi, font juftligi va emoji to'plamini yaratasan.

Qoidalar:
1. Ranglar — 6-8 ta. WCAG AA contrast (text vs background ≥ 4.5:1). Aniq hex format (#RRGGBB).
2. Gradient — primary va accent ranglardan modernroq variant (boshqa ranglar bo'lishi mumkin).
3. Fontlar — faqat quyidagilardan tanla:
   Heading: ${SAFE_FONTS_HEADING.join(", ")}
   Body: ${SAFE_FONTS_BODY.join(", ")}
4. Emoji — biznesga aniq mos 5-8 ta. Iloji boricha unique.
5. Brand voice — bittasini tanla: professional / friendly / luxury / playful / tech
6. Mood keywords — 3-5 ta sifat (warm, minimalist, premium, vibrant, ...)
7. Template — biznes turiga moslab tanla: restaurant / salon / shop / course / service
8. Faqat JSON formatda javob ber, hech qanday boshqa matn YO'Q.`;

const USER_PROMPT_TEMPLATE = `Quyidagi biznes uchun brand kit generatsiya qil:

Biznes nomi: {businessName}
Biznes turi: {businessType}
Vertikal: {vertical}
Mijoz auditoriyasi: {audience}
Tavsif: {description}
Afzal mood: {mood}

JSON formatida shu maydonlarni qaytar:
{
  "primary_color": "#hex",
  "accent_color": "#hex",
  "background_color": "#hex",
  "surface_color": "#hex",
  "text_color": "#hex",
  "text_muted_color": "#hex",
  "gradient_from": "#hex",
  "gradient_to": "#hex",
  "font_heading": "...",
  "font_body": "...",
  "emoji_set": ["...", "..."],
  "logo_emoji": "...",
  "brand_voice": "professional|friendly|luxury|playful|tech",
  "mood_keywords": ["...", "...", "..."],
  "template_id": "restaurant|salon|shop|course|service"
}`;

function buildUserPrompt(input: BrandInput): string {
  return USER_PROMPT_TEMPLATE
    .replace("{businessName}", input.businessName || "—")
    .replace("{businessType}", input.businessType || "—")
    .replace("{vertical}", input.vertical || "service")
    .replace("{audience}", input.targetAudience || "—")
    .replace("{description}", input.description || "—")
    .replace("{mood}", input.preferredMood || "—");
}

const FALLBACK: BrandKit = {
  primary_color: "#0F172A",
  accent_color: "#3B82F6",
  background_color: "#FFFFFF",
  surface_color: "#F8FAFC",
  text_color: "#0F172A",
  text_muted_color: "#64748B",
  gradient_from: "#3B82F6",
  gradient_to: "#8B5CF6",
  font_heading: "Inter",
  font_body: "Inter",
  emoji_set: ["✨", "🚀", "💼", "📈", "🎯"],
  logo_emoji: "✨",
  brand_voice: "professional",
  mood_keywords: ["clean", "modern", "trustworthy"],
  template_id: "service",
};

export async function generateBrandKit(input: BrandInput): Promise<{
  kit: BrandKit;
  cost_usd: number;
  duration_ms: number;
  raw_text: string;
}> {
  const start = Date.now();
  const userPrompt = buildUserPrompt(input);

  const response = await anthropic().messages.create({
    model: env().AI_MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let parsed: Partial<BrandKit> = {};
  try {
    const json = rawText.match(/\{[\s\S]*\}/);
    if (json) parsed = JSON.parse(json[0]) as Partial<BrandKit>;
  } catch {
    // ignore — fallback ishlatamiz
  }

  // Validatsiya + fallback merge — hech qachon broken kit qaytarmaymiz
  const kit: BrandKit = {
    primary_color: isHexColor(parsed.primary_color) ? parsed.primary_color : FALLBACK.primary_color,
    accent_color: isHexColor(parsed.accent_color) ? parsed.accent_color : FALLBACK.accent_color,
    background_color: isHexColor(parsed.background_color) ? parsed.background_color : FALLBACK.background_color,
    surface_color: isHexColor(parsed.surface_color) ? parsed.surface_color : FALLBACK.surface_color,
    text_color: isHexColor(parsed.text_color) ? parsed.text_color : FALLBACK.text_color,
    text_muted_color: isHexColor(parsed.text_muted_color) ? parsed.text_muted_color : FALLBACK.text_muted_color,
    gradient_from: isHexColor(parsed.gradient_from) ? parsed.gradient_from : FALLBACK.gradient_from,
    gradient_to: isHexColor(parsed.gradient_to) ? parsed.gradient_to : FALLBACK.gradient_to,
    font_heading: pickFont(parsed.font_heading, SAFE_FONTS_HEADING, FALLBACK.font_heading),
    font_body: pickFont(parsed.font_body, SAFE_FONTS_BODY, FALLBACK.font_body),
    emoji_set: clampList(parsed.emoji_set, 8).length ? clampList(parsed.emoji_set, 8) : FALLBACK.emoji_set,
    logo_emoji: typeof parsed.logo_emoji === "string" && parsed.logo_emoji.length <= 4 ? parsed.logo_emoji : FALLBACK.logo_emoji,
    brand_voice: ["professional", "friendly", "luxury", "playful", "tech"].includes(parsed.brand_voice as string)
      ? (parsed.brand_voice as BrandKit["brand_voice"])
      : FALLBACK.brand_voice,
    mood_keywords: clampList(parsed.mood_keywords, 5).length ? clampList(parsed.mood_keywords, 5) : FALLBACK.mood_keywords,
    template_id: ["restaurant", "salon", "shop", "course", "service"].includes(parsed.template_id as string)
      ? (parsed.template_id as BrandKit["template_id"])
      : FALLBACK.template_id,
  };

  const cost_usd =
    response.usage.input_tokens * (1 / 1_000_000) +
    response.usage.output_tokens * (5 / 1_000_000);

  return {
    kit,
    cost_usd,
    duration_ms: Date.now() - start,
    raw_text: rawText,
  };
}
