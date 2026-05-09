// 4 ta tayyor rang sxemasi — bot egasi tanlasa darhol qo'llaniladi.
// Har bir preset 4 xil biznes turi uchun ehtiyotkorlik bilan tanlangan:
// kosmetika, kiyim-kechak, elektronika, oziq-ovqat.
//
// Foydalanish:
//   - Bot egasi /app/bots/[id]/theme sahifasida tanlaydi
//   - Tanlangan preset design_kits jadvaliga yangi versiya sifatida yoziladi
//   - /shop, /site va web widget darhol yangi ranglarda ishlaydi

export type ThemePreset = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
  // Brand kit fields
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
  // Tone (AI uchun hint)
  brand_voice: "professional" | "friendly" | "luxury" | "playful" | "tech";
  template_id: "restaurant" | "salon" | "shop" | "course" | "service";
};

// ════════════════════════════════════════════════════════════
// 1. KOSMETIKA — Pink Beauty (BeautyShop ilhomidan)
// ════════════════════════════════════════════════════════════
export const COSMETICS: ThemePreset = {
  id: "cosmetics",
  name: "Kosmetika — Pink Beauty",
  emoji: "💄",
  category: "Kosmetika va parfyumeriya",
  description: "Yumshoq pushti, elegant — go'zallik, parfyum, salon mahsulotlari uchun.",
  primary_color: "#FF6B8B",
  accent_color: "#C2185B",
  background_color: "#FFF5F8",
  surface_color: "#FFFFFF",
  text_color: "#4A2B32",
  text_muted_color: "#9E6B78",
  gradient_from: "#FF6B8B",
  gradient_to: "#FF8FAB",
  font_heading: "Playfair Display",
  font_body: "Inter",
  emoji_set: ["💄", "💋", "🌸", "✨", "💆‍♀️", "🧴", "💅", "👛"],
  logo_emoji: "💄",
  brand_voice: "luxury",
  template_id: "shop",
};

// ════════════════════════════════════════════════════════════
// 2. KIYIM-KECHAK — Modern Black & Gold
// ════════════════════════════════════════════════════════════
export const FASHION: ThemePreset = {
  id: "fashion",
  name: "Kiyim — Modern Fashion",
  emoji: "👗",
  category: "Kiyim-kechak va aksessuarlar",
  description: "Qora va oltin — premium, zamonaviy fashion brendlari uchun.",
  primary_color: "#1A1A1A",
  accent_color: "#D4A85A",
  background_color: "#FAFAF7",
  surface_color: "#FFFFFF",
  text_color: "#1A1A1A",
  text_muted_color: "#6B6B6B",
  gradient_from: "#1A1A1A",
  gradient_to: "#3A3A3A",
  font_heading: "Cormorant Garamond",
  font_body: "Inter",
  emoji_set: ["👗", "👔", "👜", "👠", "🧥", "👖", "🕶️", "💎"],
  logo_emoji: "👗",
  brand_voice: "luxury",
  template_id: "shop",
};

// ════════════════════════════════════════════════════════════
// 3. ELEKTRONIKA — Tech Blue
// ════════════════════════════════════════════════════════════
export const ELECTRONICS: ThemePreset = {
  id: "electronics",
  name: "Elektronika — Tech Blue",
  emoji: "📱",
  category: "Elektronika va texnika",
  description: "Yorqin ko'k va elektrik — gadgetlar, kompyuterlar, smart-home uchun.",
  primary_color: "#0066FF",
  accent_color: "#00D9FF",
  background_color: "#F5F8FF",
  surface_color: "#FFFFFF",
  text_color: "#0A1628",
  text_muted_color: "#5A6B85",
  gradient_from: "#0066FF",
  gradient_to: "#00B8FF",
  font_heading: "Space Grotesk",
  font_body: "Inter",
  emoji_set: ["📱", "💻", "🎧", "⌚", "🖥️", "🔌", "🎮", "📷"],
  logo_emoji: "📱",
  brand_voice: "tech",
  template_id: "shop",
};

// ════════════════════════════════════════════════════════════
// 4. OZIQ-OVQAT — Warm Orange
// ════════════════════════════════════════════════════════════
export const FOOD: ThemePreset = {
  id: "food",
  name: "Oziq-ovqat — Warm Orange",
  emoji: "🍽",
  category: "Restoran, kafe, oziq-ovqat",
  description: "Iliq to'q sariq va qizil — ishtaha qo'zg'atadigan restoran ranglari.",
  primary_color: "#E84A1A",
  accent_color: "#F59E0B",
  background_color: "#FFF8F1",
  surface_color: "#FFFFFF",
  text_color: "#2D1810",
  text_muted_color: "#8B6F5C",
  gradient_from: "#E84A1A",
  gradient_to: "#F59E0B",
  font_heading: "Bricolage Grotesque",
  font_body: "DM Sans",
  emoji_set: ["🍽", "🍕", "🍔", "🥗", "🍰", "☕", "🍜", "🥘"],
  logo_emoji: "🍽",
  brand_voice: "friendly",
  template_id: "restaurant",
};

// ════════════════════════════════════════════════════════════
// REGISTRY — kelajakda boshqalarni qo'shish oson
// ════════════════════════════════════════════════════════════
export const THEME_PRESETS: ThemePreset[] = [
  COSMETICS,
  FASHION,
  ELECTRONICS,
  FOOD,
];

export function getPreset(id: string): ThemePreset | null {
  return THEME_PRESETS.find((p) => p.id === id) ?? null;
}

// Custom rang validatsiyasi — har biri #RRGGBB hex
export function isValidHex(s: unknown): s is string {
  return typeof s === "string" && /^#[0-9A-Fa-f]{6}$/.test(s);
}
