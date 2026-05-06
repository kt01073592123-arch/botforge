import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot, softDeleteBot, maskedToken } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    return NextResponse.json({ bot, token: await maskedToken(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}

const Patch = z.object({
  name: z.string().min(2).max(80).optional(),
  business_name: z.string().max(120).nullable().optional(),
  business_type: z.string().max(80).nullable().optional(),
  language: z.enum(["uz", "ru", "en"]).optional(),
  ai_model: z.string().optional(),
  system_prompt: z.string().max(8000).nullable().optional(),
  welcome_message: z.string().max(2000).nullable().optional(),
  admin_chat_id: z.number().int().nullable().optional(),
  monthly_message_limit: z.number().int().min(0).max(1_000_000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const patch = Patch.parse(await req.json());
    const { error } = await db().from("bots").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    await softDeleteBot({ ownerId: s.uid, botId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
