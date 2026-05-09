// GET/PUT /api/bots/[id]/page — page editor backend.
// Bot egasi blocks tartibini, custom CSS va meta'larni saqlaydi.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { ensureDefaultPage, savePage } from "@/lib/page_editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  blocks: z.array(z.any()).optional(),
  customCss: z.string().max(50_000).optional(),
  customHead: z.string().max(5_000).optional(),
  title: z.string().max(200).optional(),
  metaDescription: z.string().max(400).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const bot = await getBot(session.uid, id);
  if (!bot) return new NextResponse("not found", { status: 404 });

  const vertical = (bot as any).business_vertical ?? "service";
  const page = await ensureDefaultPage(bot.id, vertical);
  return NextResponse.json({ page });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  // Default page mavjudligini ta'minlash (yangi botlar uchun)
  await ensureDefaultPage(bot.id, (bot as any).business_vertical ?? "service");

  try {
    const page = await savePage({
      botId: bot.id,
      blocks: parsed.data.blocks,
      customCss: parsed.data.customCss,
      customHead: parsed.data.customHead,
      title: parsed.data.title,
      metaDescription: parsed.data.metaDescription,
    });
    return NextResponse.json({ page });
  } catch (e) {
    return NextResponse.json({ error: "save_failed", message: (e as Error).message }, { status: 500 });
  }
}
