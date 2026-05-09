// Widget info — iframe yuklanganda kit + welcome message kerak.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = db();

  const { data: bot } = await sb
    .from("bots")
    .select("id, name, business_name, welcome_message, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!bot || (bot as any).status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
  }

  const { data: kit } = await sb
    .from("design_kits")
    .select("primary_color, gradient_from, gradient_to, logo_emoji")
    .eq("bot_id", id)
    .eq("is_active", true)
    .maybeSingle();

  const k = (kit as Record<string, string> | null) ?? {};
  return NextResponse.json(
    {
      info: {
        primary_color: k.primary_color ?? "#0EA5E9",
        gradient_from: k.gradient_from ?? k.primary_color ?? "#0EA5E9",
        gradient_to: k.gradient_to ?? k.primary_color ?? "#0EA5E9",
        logo_emoji: k.logo_emoji ?? "💬",
        business_name: (bot as any).business_name ?? (bot as any).name ?? "Chat",
        welcome: (bot as any).welcome_message ?? "Salom! Sizga qanday yordam berishim mumkin?",
      },
    },
    { headers: corsHeaders }
  );
}
