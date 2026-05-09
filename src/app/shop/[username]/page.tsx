// /shop/[username] — to'liq Beauty Shop tipidagi WebApp.
// BeautyShop loyihasidan namuna qilib olingan, BotForge bot egasining ma'lumotlariga
// (business_name, contacts, services, brand_kit) avtomatik moslashtiriladi.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/supabase/server";
import ShopClient from "./ShopClient";
import "./shop-styles.css";

type ServiceItem = {
  name: string;
  price: string | number;
  description?: string;
  photo_url?: string;
  category_id?: string;
  in_stock?: boolean;
  duration?: string;
};

async function loadShopData(username: string) {
  const sb = db();

  const { data: botRow } = await sb
    .from("bots")
    .select("id, name, business_name, business_type, tg_username, status, system_prompt, welcome_message")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();
  if (!botRow || (botRow as { status: string }).status === "draft") return null;

  const botId = (botRow as { id: string }).id;

  const [{ data: bdRow }, { data: kitRow }] = await Promise.all([
    sb
      .from("bot_data")
      .select("services, categories, faq, contacts, working_hours")
      .eq("bot_id", botId)
      .maybeSingle(),
    sb
      .from("design_kits")
      .select("primary_color, accent_color, background_color, text_color, text_muted_color, gradient_from, gradient_to, font_heading, font_body, logo_emoji, hero_image_url, hero_headline, hero_subheadline, about_text")
      .eq("bot_id", botId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return {
    bot: botRow as Record<string, unknown>,
    botData: (bdRow as Record<string, unknown> | null) ?? {},
    kit: (kitRow as Record<string, unknown> | null) ?? {},
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await loadShopData(username);
  if (!data) return { title: "Topilmadi" };
  const title = (data.bot.business_name as string) ?? (data.bot.name as string);
  const description = (data.kit.hero_subheadline as string) ?? (data.bot.system_prompt as string)?.slice(0, 160);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.kit.hero_image_url ? [{ url: data.kit.hero_image_url as string }] : [],
    },
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await loadShopData(username);
  if (!data) notFound();

  // Mahsulotlarni tayyorlaymiz — har biriga unique id
  const servicesRaw = ((data.botData.services ?? []) as ServiceItem[]) ?? [];
  const products = servicesRaw.map((s, i) => ({
    id: `${i}-${slugify(s.name)}`,
    name: s.name,
    description: s.description ?? "",
    photo_url: s.photo_url ?? null,
    price: typeof s.price === "number" ? s.price : parseInt(String(s.price).replace(/\D/g, ""), 10) || 0,
    price_label: typeof s.price === "string" ? s.price : `${s.price}`,
    category_id: s.category_id ?? null,
    in_stock: s.in_stock !== false,
    duration: s.duration ?? null,
  }));

  const categories = ((data.botData.categories ?? []) as Array<{ id: string; name: string }>) ?? [];
  const contacts = (data.botData.contacts ?? {}) as { phone?: string; address?: string; instagram?: string };
  const workingHours = (data.botData.working_hours ?? {}) as Record<string, [number, number] | null>;
  const faq = ((data.botData.faq ?? []) as Array<{ q: string; a: string }>) ?? [];

  // Brand kit defaults — pink beauty
  const kit = data.kit;
  const cssVars: React.CSSProperties = {
    // @ts-expect-error CSS vars
    "--shop-bg": (kit.background_color as string) ?? "#F8E1E7",
    "--shop-text": (kit.text_color as string) ?? "#4A2B32",
    "--shop-hint": (kit.text_muted_color as string) ?? "#9E6B78",
    "--shop-primary": (kit.primary_color as string) ?? "#FF6B8B",
    "--shop-grad-from": (kit.gradient_from as string) ?? "#FF6B8B",
    "--shop-grad-to": (kit.gradient_to as string) ?? "#FF8FAB",
  };

  const businessName = (data.bot.business_name as string) ?? (data.bot.name as string);
  const tagline = (kit.hero_subheadline as string) ?? (data.bot.welcome_message as string) ?? "";
  const aboutText = (kit.about_text as string) ?? (data.bot.system_prompt as string) ?? "";
  const logoEmoji = (kit.logo_emoji as string) ?? "🛍";
  const fontHeading = (kit.font_heading as string) ?? "Inter";
  const fontBody = (kit.font_body as string) ?? "Inter";

  return (
    <div className="shop-root" style={cssVars}>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontHeading)}:wght@600;700;800&family=${encodeURIComponent(fontBody)}:wght@400;500;600&display=swap`}
      />
      <ShopClient
        botId={data.bot.id as string}
        botUsername={(data.bot.tg_username as string) ?? username}
        businessName={businessName}
        tagline={tagline}
        aboutText={aboutText}
        logoEmoji={logoEmoji}
        contacts={contacts}
        workingHours={workingHours}
        faq={faq}
        products={products}
        categories={categories}
      />
    </div>
  );
}

function slugify(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9а-яёўғҳқ]+/gi, "-").slice(0, 32);
}
