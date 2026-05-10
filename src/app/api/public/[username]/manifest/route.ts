// Dynamic PWA manifest — har bot uchun (brand rangi, nomi, ikona).
// Telegram WebApp ham, oddiy browser ham bu manifest'ni ishlata oladi.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getPack } from "@/lib/template_packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("*")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pack = bot.template_id ? await getPack(bot.template_id) : null;
  const bk = pack?.brand_kit ?? {};
  const primaryColor = (bk as { primary_color?: string }).primary_color ?? "#EC4899";
  const tintColor = (bk as { background_tint?: string }).background_tint ?? "#FFFBFD";
  const icon = pack?.icon ?? "🤖";
  const name = bot.business_name ?? bot.name;

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    description: bot.description ?? `${name} — Mini App`,
    start_url: `/c/${username}`,
    scope: `/c/${username}`,
    display: "standalone",
    orientation: "portrait",
    background_color: tintColor,
    theme_color: primaryColor,
    icons: [
      {
        src: `/api/public/${username}/icon?size=192`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `/api/public/${username}/icon?size=512`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `/api/public/${username}/icon?size=512&masked=1`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["business", "shopping"],
    lang: bot.language === "ru" ? "ru" : bot.language === "en" ? "en" : "uz",
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });

  void icon; // (icon emoji ham endpoint'da render qilinadi — pastda)
}
