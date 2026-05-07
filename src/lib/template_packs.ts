// Template pack ma’lumotlarini ishlatish bo‘yicha helperlar.

import { db } from "./supabase/server";

export type SubType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt_addon: string;
};

export type PriceTier = {
  id: string;
  name: string;
  multiplier: number;
};

export type Tone = {
  id: string;
  name: string;
  prompt_addon: string;
};

export type BrandKit = {
  primary_color: string;
  accent_color: string;
  background_tint: string;
  text_on_primary: string;
  emoji_set: string[];
  font_hint: string;
  gradient: string;
};

export type Service = { name: string; base_price_uzs: number; duration?: string };
export type FaqItem = { q: string; a: string };
export type WorkingHours = Record<string, [number, number] | null>;
export type Broadcast = {
  title: string;
  text: string;
  suggested_segment: "all" | "leads" | "converted" | "no_lead";
};

export type Pack = {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  vertical: string | null;
  is_pack: boolean;
  sub_types: SubType[];
  price_tiers: PriceTier[];
  tones: Tone[];
  brand_kit: BrandKit | Record<string, never>;
  default_system_prompt: string;
  default_welcome: string;
  default_buttons: { text: string }[];
  default_services: Service[];
  default_faq: FaqItem[];
  default_working_hours: WorkingHours;
  default_contacts_template: { phone?: string; address?: string; instagram?: string };
  sample_broadcasts: Broadcast[];
  is_active: boolean;
};

// jsonb postgres-driver tomonidan qator-qator string sifatida qaytishi mumkin —
// shuning uchun parse qilamiz.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonb(v: any): any {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(row: any): Pack {
  return {
    ...row,
    sub_types: parseJsonb(row.sub_types) ?? [],
    price_tiers: parseJsonb(row.price_tiers) ?? [],
    tones: parseJsonb(row.tones) ?? [],
    brand_kit: parseJsonb(row.brand_kit) ?? {},
    default_buttons: parseJsonb(row.default_buttons) ?? [],
    default_services: parseJsonb(row.default_services) ?? [],
    default_faq: parseJsonb(row.default_faq) ?? [],
    default_working_hours: parseJsonb(row.default_working_hours) ?? {},
    default_contacts_template: parseJsonb(row.default_contacts_template) ?? {},
    sample_broadcasts: parseJsonb(row.sample_broadcasts) ?? [],
  };
}

export async function listPacks(): Promise<Pack[]> {
  const { data } = await db()
    .from("bot_templates")
    .select("*")
    .eq("is_active", true)
    .order("is_pack", { ascending: false })
    .order("name");
  return (data ?? []).map(normalize);
}

export async function getPack(id: string): Promise<Pack | null> {
  const { data } = await db()
    .from("bot_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? normalize(data) : null;
}

// Narxni 5 000 ga yaxlitlab chiroyli ko‘rinishga keltiramiz
function roundPrice(uzs: number): number {
  if (uzs === 0) return 0;
  if (uzs < 50_000) return Math.round(uzs / 5_000) * 5_000;
  if (uzs < 500_000) return Math.round(uzs / 10_000) * 10_000;
  return Math.round(uzs / 50_000) * 50_000;
}

export function applyTier(services: Service[], multiplier: number): Service[] {
  return services.map((s) => ({
    ...s,
    base_price_uzs: roundPrice(s.base_price_uzs * multiplier),
  }));
}

// Wizard tanlovlari asosida bot configini qurish
export type WizardChoices = {
  sub_type_id?: string;
  tier_id?: string;
  tone_id?: string;
};

export type ResolvedConfig = {
  system_prompt: string;
  welcome_message: string;
  buttons: { text: string }[];
  services: { name: string; price: string; duration?: string }[];
  faq: FaqItem[];
  working_hours: WorkingHours;
  contacts: { phone?: string; address?: string; instagram?: string };
  business_type: string | null;
};

export function resolveConfig(pack: Pack, choices: WizardChoices): ResolvedConfig {
  const sub = pack.sub_types.find((s) => s.id === choices.sub_type_id);
  const tier = pack.price_tiers.find((t) => t.id === choices.tier_id) ?? pack.price_tiers.find((t) => t.id === "mid");
  const tone = pack.tones.find((t) => t.id === choices.tone_id);

  // System prompt = base + sub_type addon + tone addon
  let prompt = pack.default_system_prompt ?? "";
  if (sub?.prompt_addon) prompt += `\n\n=== BIZNES TURI ===\n${sub.prompt_addon}`;
  if (tone?.prompt_addon) prompt += `\n\n=== OHANG ===\n${tone.prompt_addon}`;

  // Services with tier multiplier, formatted as price strings
  const tierMul = tier?.multiplier ?? 1;
  const services = pack.default_services.map((s) => {
    const price = roundPrice(s.base_price_uzs * tierMul);
    const priceStr =
      price === 0 ? "Bepul" : `${price.toLocaleString("uz-UZ")} so‘m`;
    return {
      name: s.name,
      price: priceStr,
      duration: s.duration,
    };
  });

  return {
    system_prompt: prompt,
    welcome_message: pack.default_welcome,
    buttons: pack.default_buttons,
    services,
    faq: pack.default_faq,
    working_hours: pack.default_working_hours,
    contacts: pack.default_contacts_template,
    business_type: sub?.name ?? null,
  };
}
