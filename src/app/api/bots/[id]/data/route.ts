import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot, getBotData, updateBotData } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  services: z
    .array(
      z.object({
        name: z.string(),
        price: z.string(),
        duration: z.string().optional(),
        description: z.string().optional(),
        photo_url: z.string().optional(),
        category_id: z.string().optional(),
        in_stock: z.boolean().optional(),
      })
    )
    .optional(),
  categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        position: z.number().optional(),
        icon: z.string().optional(),
      })
    )
    .optional(),
  working_hours: z.record(z.union([z.tuple([z.number(), z.number()]), z.null()])).optional(),
  contacts: z
    .object({
      phone: z.string().optional(),
      address: z.string().optional(),
      instagram: z.string().optional(),
    })
    .optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const data = await getBotData(id);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const body = Body.parse(await req.json());
    await updateBotData(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
