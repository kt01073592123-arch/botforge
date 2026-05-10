// Dynamic SVG icon — bot brand rangida ramka + emoji ikona o'rtada.
// PWA install bannerida va home screen'da ko'rinadi.

import { db } from "@/lib/supabase/server";
import { getPack } from "@/lib/template_packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const url = new URL(req.url);
  const size = Math.min(1024, Math.max(64, Number(url.searchParams.get("size") ?? 512)));
  const masked = url.searchParams.get("masked") === "1";

  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("template_id, business_name")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .maybeSingle();

  let icon = "🤖";
  let primary = "#EC4899";
  let accent = "#8B5CF6";
  if (bot?.template_id) {
    const pack = await getPack(bot.template_id as string);
    if (pack?.icon) icon = pack.icon;
    const bk = (pack?.brand_kit ?? {}) as {
      primary_color?: string;
      accent_color?: string;
    };
    if (bk.primary_color) primary = bk.primary_color;
    if (bk.accent_color) accent = bk.accent_color;
  }

  // Maskable icon: ko'proq padding (Android adaptive icons mask qiladi)
  const padding = masked ? size * 0.18 : size * 0.06;
  const iconSize = size - padding * 2;
  const fontSize = iconSize * 0.55;
  const radius = masked ? 0 : size * 0.18;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">
    ${icon}
  </text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
