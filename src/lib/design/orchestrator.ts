// Design Orchestrator — brand + copy + image'ni parallel ravishda yaratadi va
// design_kits jadvaliga yozadi. Bot egasi 1-marta chaqirsa, hammasi 30 sekundda tayyor.

import { db } from "../supabase/server";
import { generateBrandKit, type BrandKit, type BrandInput } from "./brand_generator";
import { generateSiteCopy, type SiteCopy, type CopyInput } from "./copy_generator";
import { generateHeroImage, type ImageOutput } from "./image_generator";

export type GenerateInput = {
  botId: string;
  businessName: string;
  businessType?: string;
  vertical?: string;
  description?: string;
  preferredMood?: string;
  language?: "uz" | "ru" | "en";
};

export type DesignKitFull = {
  id: string;
  bot_id: string;
  version: number;
  is_active: boolean;
  // Brand
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
  // Image
  hero_image_url: string | null;
  hero_image_alt: string | null;
  // Layout
  template_id: string;
  // Copy
  hero_headline: string;
  hero_subheadline: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  usp_items: SiteCopy["usp_items"];
  about_text: string;
  testimonial_seeds: SiteCopy["testimonial_seeds"];
  brand_voice: string;
  mood_keywords: string[];
  generation_meta: Record<string, unknown>;
};

export async function generateDesignKit(input: GenerateInput): Promise<{
  kit: DesignKitFull;
  totalCost: number;
  totalDuration: number;
}> {
  const start = Date.now();
  const sb = db();

  // ── 1) Job yozuvi (kuzatish uchun)
  const { data: job } = await sb
    .from("design_jobs")
    .insert({
      bot_id: input.botId,
      kind: "full",
      status: "running",
      prompt: JSON.stringify(input),
    })
    .select("id")
    .single();

  try {
    // ── 2) Brand kit (rang/font/emoji) — birinchi qadam, copy uchun voice kerak
    const brandInput: BrandInput = {
      businessName: input.businessName,
      businessType: input.businessType,
      vertical: input.vertical,
      description: input.description,
      preferredMood: input.preferredMood,
    };
    const brand = await generateBrandKit(brandInput);

    // ── 3) Copy + Hero image — parallel (brand voice asosida)
    const copyInput: CopyInput = {
      businessName: input.businessName,
      businessType: input.businessType,
      description: input.description,
      vertical: input.vertical ?? brand.kit.template_id,
      brandVoice: brand.kit.brand_voice,
      language: input.language ?? "uz",
      emojiSet: brand.kit.emoji_set,
    };

    const [copyResult, imageResult] = await Promise.all([
      generateSiteCopy(copyInput),
      generateHeroImage(
        {
          businessName: input.businessName,
          vertical: input.vertical ?? brand.kit.template_id,
          brandVoice: brand.kit.brand_voice,
          moodKeywords: brand.kit.mood_keywords,
          primaryColor: brand.kit.primary_color,
          description: input.description,
        },
        input.botId
      ),
    ]);

    // ── 4) Eski active kitni nofaol qil
    await sb
      .from("design_kits")
      .update({ is_active: false })
      .eq("bot_id", input.botId)
      .eq("is_active", true);

    // ── 5) Yangi versiya raqamini hisoblash
    const { data: latest } = await sb
      .from("design_kits")
      .select("version")
      .eq("bot_id", input.botId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((latest?.version as number | undefined) ?? 0) + 1;

    // ── 6) Saqlash
    const totalCost = brand.cost_usd + copyResult.cost_usd + imageResult.cost_usd;
    const totalDuration = Date.now() - start;

    const { data: saved, error } = await sb
      .from("design_kits")
      .insert({
        bot_id: input.botId,
        version: nextVersion,
        is_active: true,
        primary_color: brand.kit.primary_color,
        accent_color: brand.kit.accent_color,
        background_color: brand.kit.background_color,
        surface_color: brand.kit.surface_color,
        text_color: brand.kit.text_color,
        text_muted_color: brand.kit.text_muted_color,
        gradient_from: brand.kit.gradient_from,
        gradient_to: brand.kit.gradient_to,
        font_heading: brand.kit.font_heading,
        font_body: brand.kit.font_body,
        emoji_set: brand.kit.emoji_set,
        logo_emoji: brand.kit.logo_emoji,
        hero_image_url: imageResult.url,
        hero_image_alt: imageResult.alt_text,
        template_id: brand.kit.template_id,
        hero_headline: copyResult.copy.hero_headline,
        hero_subheadline: copyResult.copy.hero_subheadline,
        hero_cta_primary: copyResult.copy.hero_cta_primary,
        hero_cta_secondary: copyResult.copy.hero_cta_secondary,
        usp_items: copyResult.copy.usp_items,
        about_text: copyResult.copy.about_text,
        testimonial_seeds: copyResult.copy.testimonial_seeds,
        brand_voice: brand.kit.brand_voice,
        mood_keywords: brand.kit.mood_keywords,
        generation_meta: {
          brand_duration_ms: brand.duration_ms,
          copy_duration_ms: copyResult.duration_ms,
          image_duration_ms: imageResult.duration_ms,
          image_provider: imageResult.provider,
          total_cost_usd: totalCost,
        },
      })
      .select("*")
      .single();

    if (error || !saved) {
      throw new Error(`design_kits insert: ${error?.message ?? "unknown"}`);
    }

    // ── 7) Hero rasmni ai_assets jadvaliga ham yozamiz (alohida arxiv)
    await sb.from("ai_assets").insert({
      bot_id: input.botId,
      design_kit_id: saved.id,
      kind: "hero",
      url: imageResult.url,
      prompt: imageResult.prompt,
      alt_text: imageResult.alt_text,
      width: imageResult.width,
      height: imageResult.height,
      provider: imageResult.provider,
    });

    // ── 8) Job statusini yopamiz
    if (job) {
      await sb
        .from("design_jobs")
        .update({
          status: "done",
          design_kit_id: saved.id,
          cost_usd: totalCost,
          duration_ms: totalDuration,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    return {
      kit: saved as unknown as DesignKitFull,
      totalCost,
      totalDuration,
    };
  } catch (e) {
    if (job) {
      await sb
        .from("design_jobs")
        .update({
          status: "failed",
          error: (e as Error).message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
    throw e;
  }
}

// Aktiv kitni o'qish (public sahifa va dashboard uchun)
export async function getActiveDesignKit(botId: string): Promise<DesignKitFull | null> {
  const { data } = await db()
    .from("design_kits")
    .select("*")
    .eq("bot_id", botId)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as DesignKitFull) ?? null;
}
