import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; convId: string }> }) {
  try {
    const s = await requireSession();
    const { id, convId } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const sb = db();
    const { data: conv } = await sb
      .from("conversations")
      .select("*")
      .eq("id", convId)
      .eq("bot_id", id)
      .maybeSingle();
    if (!conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const { data: messages } = await sb
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    return NextResponse.json({ conversation: conv, messages: messages ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
