// POST /api/bots/[id]/design/generate
// Bot egasi "AI design generate" tugmasini bossa shu chaqiriladi.
// Brand + Copy + Hero image — hammasini parallel ravishda Anthropic + Replicate orqali yaratadi,
// keyin design_kits jadvaliga yozadi.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { generateDesignKit, getActiveDesignKit } from "@/lib/design/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  preferredMood: z.string().max(80).optional(),
  language: z.enum(["uz", "ru", "en"]).optional(),
  vertical: z.enum(["restaurant", "salon", "shop", "course", "service"]).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_input", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await generateDesignKit({
      botId: bot.id,
      businessName: bot.business_name ?? bot.name,
      businessType: bot.business_type ?? undefined,
      vertical: parsed.data.vertical,
      description: bot.system_prompt ?? undefined,
      preferredMood: parsed.data.preferredMood,
      language: parsed.data.language,
    });

    return NextResponse.json({
      ok: true,
      kit: result.kit,
      cost_usd: result.totalCost,
      duration_ms: result.totalDuration,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "generation_failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}

// Hozirgi aktiv kitni o'qish
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const kit = await getActiveDesignKit(bot.id);
  return NextResponse.json({ kit });
}
