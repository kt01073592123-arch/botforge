// Public landing page uchun ma'lumot. Auth shart emas.
// Token va sezgir narsa qaytmaydi — faqat mijozga ko‘rsatiladigan ma'lumot.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getPack } from "@/lib/template_packs";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// jsonb postgres-driver string sifatida qaytishi mumkin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jp(v: any) {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const ok = await rateLimit({
    scope: "api_ip",
    key: `public|${clientIp(req)}`,
    windowSeconds: 60,
    limit: 60,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko‘p urinish" }, { status: 429 });

  const { username } = await ctx.params;
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("*")
    .eq("tg_username", username)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const { data: bdRaw } = await sb
    .from("bot_data")
    .select("*")
    .eq("bot_id", bot.id)
    .maybeSingle();

  const bd = bdRaw
    ? {
        services: jp(bdRaw.services) ?? [],
        categories: jp(bdRaw.categories) ?? [],
        faq: jp(bdRaw.faq) ?? [],
        working_hours: jp(bdRaw.working_hours) ?? {},
        contacts: jp(bdRaw.contacts) ?? {},
      }
    : null;

  const pack = bot.template_id ? await getPack(bot.template_id) : null;

  return NextResponse.json({
    business_name: bot.business_name ?? bot.name,
    description: pack?.description ?? null,
    icon: pack?.icon ?? "🤖",
    bot_username: bot.tg_username,
    deep_link: `https://t.me/${bot.tg_username}`,
    brand_kit: pack?.brand_kit ?? null,
    services: bd?.services ?? [],
    categories: bd?.categories ?? [],
    faq: bd?.faq ?? [],
    working_hours: bd?.working_hours ?? {},
    contacts: bd?.contacts ?? {},
  });
}
