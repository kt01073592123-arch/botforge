import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const { data } = await db()
      .from("broadcasts")
      .select("*")
      .eq("bot_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    return NextResponse.json({ broadcasts: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

const Body = z.object({
  text: z.string().min(2).max(4000),
  segment: z.enum(["all", "leads", "converted", "no_lead"]).default("all"),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const body = Body.parse(await req.json());
    const sb = db();
    const { data: bc, error } = await sb
      .from("broadcasts")
      .insert({
        bot_id: id,
        text: body.text,
        segment: body.segment,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { data: count, error: enqErr } = await sb.rpc("broadcast_enqueue", {
      p_broadcast_id: bc.id,
    });
    if (enqErr) throw new Error(enqErr.message);

    return NextResponse.json({ broadcast: bc, recipients: count });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
