// Smart public page — bot.business_vertical va design_kit.template_id'ga qarab
// 5 ta template'dan birini render qiladi. Server component (SEO-friendly).
//
// URL: /site/<bot_username>
//
// Eslatma: hozir /b/[username] ham bor (eski landing). Bu yangi sahifa AI-generated
// design kit ishlatadi. Keyinchalik /b/ ni shuni o'rniga deprecate qilamiz.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/supabase/server";
import { renderTemplate, type TemplateContext } from "@/components/design/templates";
import type { Kit } from "@/components/design/primitives";

type BotPublicData = {
  id: string;
  name: string;
  business_name: string | null;
  description: string | null;
  tg_username: string | null;
  business_vertical: string | null;
  services: Array<{
    name: string;
    price: string;
    duration?: string;
    description?: string;
    photo_url?: string;
    category_id?: string;
    in_stock?: boolean;
  }>;
  categories: Array<{ id: string; name: string }>;
  faq: Array<{ q: string; a: string }>;
  contacts: { phone?: string; address?: string; instagram?: string };
  working_hours: Record<string, [number, number] | null>;
};

async function loadBotData(username: string): Promise<{
  bot: BotPublicData;
  kit: Kit & {
    template_id: string;
    hero_headline?: string;
    hero_subheadline?: string;
    hero_cta_primary?: string;
    hero_cta_secondary?: string;
    usp_items?: Array<{ icon: string; title: string; description: string }>;
    about_text?: string;
    testimonial_seeds?: Array<{ name: string; text: string; rating: number }>;
  };
} | null> {
  const sb = db();

  const { data: botRow } = await sb
    .from("bots")
    .select("id, name, business_name, business_type, business_vertical, system_prompt, tg_username, status")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!botRow || (botRow as { status: string }).status === "draft") return null;

  const botId = (botRow as { id: string }).id;

  // Bot data (services, faq, contacts, hours)
  const { data: bdRow } = await sb
    .from("bot_data")
    .select("services, categories, faq, contacts, working_hours")
    .eq("bot_id", botId)
    .maybeSingle();

  // Active design kit
  const { data: kitRow } = await sb
    .from("design_kits")
    .select("*")
    .eq("bot_id", botId)
    .eq("is_active", true)
    .maybeSingle();

  if (!kitRow) {
    // Hali AI design generate qilinmagan — default kit qaytaramiz
    return {
      bot: {
        ...(botRow as Record<string, unknown>),
        services: ((bdRow as any)?.services ?? []) as BotPublicData["services"],
        categories: ((bdRow as any)?.categories ?? []) as BotPublicData["categories"],
        faq: ((bdRow as any)?.faq ?? []) as BotPublicData["faq"],
        contacts: ((bdRow as any)?.contacts ?? {}) as BotPublicData["contacts"],
        working_hours: ((bdRow as any)?.working_hours ?? {}) as BotPublicData["working_hours"],
        description: (botRow as any).system_prompt ?? null,
      } as BotPublicData,
      kit: defaultKit((botRow as { name: string }).name),
    };
  }

  const k = kitRow as Record<string, unknown>;
  return {
    bot: {
      ...(botRow as Record<string, unknown>),
      services: ((bdRow as any)?.services ?? []) as BotPublicData["services"],
      categories: ((bdRow as any)?.categories ?? []) as BotPublicData["categories"],
      faq: ((bdRow as any)?.faq ?? []) as BotPublicData["faq"],
      contacts: ((bdRow as any)?.contacts ?? {}) as BotPublicData["contacts"],
      working_hours: ((bdRow as any)?.working_hours ?? {}) as BotPublicData["working_hours"],
      description: (botRow as any).system_prompt ?? null,
    } as BotPublicData,
    kit: k as unknown as Kit & { template_id: string },
  };
}

function defaultKit(businessName: string): Kit & {
  template_id: string;
  hero_headline?: string;
  hero_subheadline?: string;
  hero_cta_primary?: string;
} {
  return {
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
    emoji_set: ["✨"],
    logo_emoji: "✨",
    hero_image_url: null,
    hero_image_alt: null,
    template_id: "service",
    hero_headline: businessName,
    hero_subheadline: "Bizga xush kelibsiz!",
    hero_cta_primary: "Bog'lanish",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await loadBotData(username);
  if (!data) return { title: "Bot topilmadi" };
  const title = (data.kit as any).hero_headline ?? data.bot.business_name ?? data.bot.name;
  const description = (data.kit as any).hero_subheadline ?? data.bot.description ?? "";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.kit.hero_image_url ? [{ url: data.kit.hero_image_url }] : [],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await loadBotData(username);
  if (!data) notFound();

  const ctx: TemplateContext = {
    kit: data.kit,
    businessName: data.bot.business_name ?? data.bot.name,
    description: data.bot.description,
    services: data.bot.services,
    categories: data.bot.categories,
    faq: data.bot.faq,
    contacts: data.bot.contacts,
    workingHours: data.bot.working_hours,
    deepLink: data.bot.tg_username ? `https://t.me/${data.bot.tg_username}` : undefined,
  };

  const templateId = data.bot.business_vertical ?? data.kit.template_id ?? "service";
  return renderTemplate(templateId, data.kit, ctx);
}
