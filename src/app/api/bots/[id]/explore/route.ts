// Bot egasi marketplace sozlamalari (is_public, tavsif, kategoriya).

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  is_public: z.boolean(),
  description: z.string().max(200).nullable().optional(),
  explore_category: z
    .enum(["shop", "salon", "restaurant", "service", "course", "clinic", "fitness", "other"])
    .nullable()
    .optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const rows = (await sql()`
      select is_public, description, explore_category
        from public.bots
       where id = ${id}
    `) as Array<{
      is_public: boolean;
      description: string | null;
      explore_category: string | null;
    }>;
    return NextResponse.json({ bot: rows[0] ?? null });
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
    await sql()`
      update public.bots set
        is_public = ${body.is_public},
        description = ${body.description ?? null},
        explore_category = ${body.explore_category ?? null}
       where id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
