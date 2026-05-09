// /api/bots/[id]/theme — bot egasi rang sxemasini tanlaydi yoki custom kiritadi.
// AI generate'siz tezda yangi design_kit versiyasini saqlaydi.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";
import { THEME_PRESETS, getPreset, isValidHex, type ThemePreset } from "@/lib/design/theme_presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // Faqat preset id bersa avtomatik to'ldiriladi
  preset_id: z.enum(["cosmetics", "fashion", "electronics", "food"]).optional(),
  // Yoki custom — har birini alohida bersa
  custom: z
    .object({
      primary_color: z.string().optional(),
      accent_color: z.string().optional(),
      background_color: z.string().optional(),
      surface_color: z.string().optional(),
      text_color: z.string().optional(),
      text_muted_color: z.string().optional(),
      gradient_from: z.string().optional(),
      gradient_to: z.string().optional(),
      font_heading: z.string().max(60).optional(),
      font_body: z.string().max(60).optional(),
      logo_emoji: z.string().max(8).optional(),
      emoji_set: z.array(z.string().max(8)).max(12).optional(),
    })
    .optional(),
});

const ALLOWED_FONTS = [
  "Inter", "Playfair Display", "Montserrat", "Poppins", "DM Serif Display",
  "Cormorant Garamond", "Space Grotesk", "Bricolage Grotesque", "Outfit",
  "DM Sans", "Manrope", "Plus Jakarta Sans", "Lato",
];

export async function GET(_req: Request) {
  // Hamma preset'larni qaytaradi (theme tanlash sahifasi uchun)
  return NextResponse.json({ presets: THEME_PRESETS });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_input", issues: parsed.error.issues }, { status: 400 });
  }

  // Asosiy kit'ni tayyorlash
  let kit: Partial<ThemePreset> = {};

  // 1) Preset bo'lsa undan boshlanamiz
  if (parsed.data.preset_id) {
    const preset = getPreset(parsed.data.preset_id);
    if (!preset) return NextResponse.json({ error: "preset_not_found" }, { status: 400 });
    kit = { ...preset };
  }

  // 2) Custom bo'lsa preset ustiga qo'shamiz/almashtiramiz
  if (parsed.data.custom) {
    const c = parsed.data.custom;
    const colors: Array<keyof typeof c & keyof ThemePreset> = [
      "primary_color", "accent_color", "background_color", "surface_color",
      "text_color", "text_muted_color", "gradient_from", "gradient_to",
    ];
    for (const k of colors) {
      const v = c[k];
      if (v !== undefined) {
        if (!isValidHex(v)) {
          return NextResponse.json({ error: `bad_color_${k}` }, { status: 400 });
        }
        (kit as Record<string, unknown>)[k] = v;
      }
    }
    if (c.font_heading !== undefined) {
      if (!ALLOWED_FONTS.includes(c.font_heading)) {
        return NextResponse.json({ error: "bad_font_heading" }, { status: 400 });
      }
      kit.font_heading = c.font_heading;
    }
    if (c.font_body !== undefined) {
      if (!ALLOWED_FONTS.includes(c.font_body)) {
        return NextResponse.json({ error: "bad_font_body" }, { status: 400 });
      }
      kit.font_body = c.font_body;
    }
    if (c.logo_emoji !== undefined) kit.logo_emoji = c.logo_emoji;
    if (c.emoji_set !== undefined && c.emoji_set.length > 0) kit.emoji_set = c.emoji_set;
  }

  // 3) Hech bo'lmaganda primary_color bo'lishi shart
  if (!kit.primary_color) {
    return NextResponse.json({ error: "missing_colors", message: "preset_id yoki custom kerak" }, { status: 400 });
  }

  const sb = db();

  // ── Hozirgi aktiv kit'ni o'qib, undagi copy/image'larni saqlab qolamiz
  const { data: prev } = await sb
    .from("design_kits")
    .select("*")
    .eq("bot_id", bot.id)
    .eq("is_active", true)
    .maybeSingle();

  const prevKit = (prev as Record<string, unknown> | null) ?? {};

  // ── Eski active'ni nofaol qilamiz
  await sb
    .from("design_kits")
    .update({ is_active: false })
    .eq("bot_id", bot.id)
    .eq("is_active", true);

  // ── Yangi versiya raqamini hisoblash
  const { data: latest } = await sb
    .from("design_kits")
    .select("version")
    .eq("bot_id", bot.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((latest?.version as number | undefined) ?? 0) + 1;

  // ── Yangi yozuv: faqat ranglar va font'lar yangilanadi.
  // Hero rasm, copy, USP — eskidan saqlanadi (bot egasi AI Generate qilsa,
  // alohida endpoint /design/generate ishlatadi).
  const { data: saved, error } = await sb
    .from("design_kits")
    .insert({
      bot_id: bot.id,
      version: nextVersion,
      is_active: true,
      // Kit'dan
      primary_color: kit.primary_color,
      accent_color: kit.accent_color ?? prevKit.accent_color ?? kit.primary_color,
      background_color: kit.background_color ?? prevKit.background_color ?? "#FFFFFF",
      surface_color: kit.surface_color ?? prevKit.surface_color ?? "#F8FAFC",
      text_color: kit.text_color ?? prevKit.text_color ?? "#0F172A",
      text_muted_color: kit.text_muted_color ?? prevKit.text_muted_color ?? "#64748B",
      gradient_from: kit.gradient_from ?? prevKit.gradient_from ?? kit.primary_color,
      gradient_to: kit.gradient_to ?? prevKit.gradient_to ?? kit.primary_color,
      font_heading: kit.font_heading ?? prevKit.font_heading ?? "Inter",
      font_body: kit.font_body ?? prevKit.font_body ?? "Inter",
      emoji_set: kit.emoji_set ?? prevKit.emoji_set ?? ["✨"],
      logo_emoji: kit.logo_emoji ?? prevKit.logo_emoji ?? "✨",
      // Eski copy va rasmlarni saqlab qolamiz
      hero_image_url: prevKit.hero_image_url ?? null,
      hero_image_alt: prevKit.hero_image_alt ?? null,
      hero_headline: prevKit.hero_headline ?? null,
      hero_subheadline: prevKit.hero_subheadline ?? null,
      hero_cta_primary: prevKit.hero_cta_primary ?? null,
      hero_cta_secondary: prevKit.hero_cta_secondary ?? null,
      usp_items: prevKit.usp_items ?? [],
      about_text: prevKit.about_text ?? null,
      testimonial_seeds: prevKit.testimonial_seeds ?? [],
      brand_voice: kit.brand_voice ?? prevKit.brand_voice ?? "friendly",
      mood_keywords: prevKit.mood_keywords ?? [],
      template_id: kit.template_id ?? prevKit.template_id ?? "service",
      generation_meta: {
        source: parsed.data.preset_id ? `preset:${parsed.data.preset_id}` : "custom",
        applied_at: new Date().toISOString(),
      },
    })
    .select("*")
    .single();

  if (error || !saved) {
    return NextResponse.json({ error: "save_failed", message: error?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, kit: saved });
}
