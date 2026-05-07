import { NextResponse } from "next/server";
import { listPacks } from "@/lib/template_packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await listPacks();
  // Frontendga sezgir maydonlar bermay, faqat zarur narsani qaytarish
  const sanitized = templates.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    category: t.category,
    description: t.description,
    vertical: t.vertical,
    is_pack: t.is_pack,
    brand_kit: t.brand_kit,
    sub_types: t.sub_types,
    price_tiers: t.price_tiers,
    tones: t.tones,
    default_buttons: t.default_buttons,
    default_welcome: t.default_welcome,
    services_count: (t.default_services ?? []).length,
    faq_count: (t.default_faq ?? []).length,
    broadcasts_count: (t.sample_broadcasts ?? []).length,
  }));
  return NextResponse.json({ templates: sanitized });
}
