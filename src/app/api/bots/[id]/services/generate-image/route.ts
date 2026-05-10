// Mahsulot uchun rasm yaratadi (Unsplash → Replicate → Picsum tartibida).
// POST: { productName: string, description?: string }
// Returns: { url, provider, cost_usd }

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { rateLimit } from "@/lib/ratelimit";
import { generateProductImage } from "@/lib/design/product_image";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  productName: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const ok = await rateLimit({
      scope: "api_user",
      key: `gen_image|${s.uid}`,
      windowSeconds: 60,
      limit: 20,
    });
    if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

    const body = Body.parse(await req.json());

    // Vertical from template
    let vertical: string | undefined;
    if (bot.template_id) {
      const { data: tpl } = await db()
        .from("bot_templates")
        .select("vertical")
        .eq("id", bot.template_id)
        .maybeSingle();
      vertical = (tpl as { vertical?: string } | null)?.vertical;
    }

    const result = await generateProductImage(
      {
        productName: body.productName,
        description: body.description,
        vertical,
      },
      id,
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
