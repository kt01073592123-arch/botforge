// Bitta pack’ning to‘liq ma’lumotini qaytaradi (wizard preview uchun).

import { NextResponse } from "next/server";
import { getPack, resolveConfig, type WizardChoices } from "@/lib/template_packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pack = await getPack(id);
  if (!pack) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const url = new URL(req.url);
  const choices: WizardChoices = {
    sub_type_id: url.searchParams.get("sub_type") ?? undefined,
    tier_id: url.searchParams.get("tier") ?? undefined,
    tone_id: url.searchParams.get("tone") ?? undefined,
  };

  const resolved = pack.is_pack ? resolveConfig(pack, choices) : null;

  return NextResponse.json({
    pack: {
      id: pack.id,
      name: pack.name,
      icon: pack.icon,
      description: pack.description,
      vertical: pack.vertical,
      is_pack: pack.is_pack,
      brand_kit: pack.brand_kit,
      sub_types: pack.sub_types,
      price_tiers: pack.price_tiers,
      tones: pack.tones,
      default_welcome: pack.default_welcome,
      default_buttons: pack.default_buttons,
      sample_broadcasts: pack.sample_broadcasts,
      faq: pack.default_faq,
    },
    resolved,
  });
}
