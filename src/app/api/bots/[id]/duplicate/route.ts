// Bot’ni klonlash — token va tarixiy ma'lumotsiz, faqat sozlamalar.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";
import { canCreateBot } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2).max(80),
  business_name: z.string().max(120).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const src = await getBot(s.uid, id);
    if (!src) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const allowed = await canCreateBot(s.uid);
    if (!allowed) {
      return NextResponse.json(
        { error: "Tarif limiti tugadi" },
        { status: 400 }
      );
    }

    const body = Body.parse(await req.json());
    const sb = db();

    // Yangi bot — token va tg_bot_id’siz, status=draft
    const { data: newBot, error } = await sb
      .from("bots")
      .insert({
        owner_id: s.uid,
        template_id: src.template_id,
        name: body.name,
        business_name: body.business_name ?? null,
        business_type: src.business_type,
        language: src.language,
        status: "draft",
        ai_model: src.ai_model,
        system_prompt: src.system_prompt,
        welcome_message: src.welcome_message,
        webhook_secret: randomBytes(24).toString("hex"),
        monthly_message_limit: src.monthly_message_limit,
      })
      .select("*")
      .single();
    if (error || !newBot) throw new Error(error?.message ?? "create failed");

    // Bot data — services, faq, working_hours, contacts, categories
    const { data: srcData } = await sb
      .from("bot_data")
      .select("*")
      .eq("bot_id", src.id)
      .maybeSingle();
    if (srcData) {
      await sb.from("bot_data").insert({
        bot_id: newBot.id,
        services: srcData.services ?? [],
        categories: srcData.categories ?? [],
        working_hours: srcData.working_hours ?? {},
        contacts: srcData.contacts ?? {},
        faq: srcData.faq ?? [],
      });
    } else {
      await sb.from("bot_data").insert({ bot_id: newBot.id });
    }

    return NextResponse.json({ bot: newBot });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
