// A/B test welcome xabarlar — natijalar va sozlash.
// GET: natijalar (variant A vs B konversiya)
// PUT: { welcome_message_b: string | null } — variantni saqlash yoki o'chirish

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AbRow = {
  variant: string;
  conversations_count: number;
  orders_count: number;
  orders_completed: number;
  revenue_uzs: string;
};

const PutBody = z.object({
  welcome_message_b: z.string().max(2000).nullable(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30)));

    const rows = (await sql()`
      select * from public.ab_test_results(${id}::uuid, ${days}::int)
    `) as unknown as AbRow[];

    const result = rows.map((r) => {
      const orderRate =
        r.conversations_count > 0
          ? (r.orders_count / r.conversations_count) * 100
          : 0;
      return {
        variant: r.variant,
        conversations: r.conversations_count,
        orders: r.orders_count,
        orders_completed: r.orders_completed,
        revenue_uzs: Number(r.revenue_uzs),
        order_rate_pct: Math.round(orderRate * 10) / 10,
      };
    });

    return NextResponse.json({
      days,
      welcome_a: bot.welcome_message,
      welcome_b: (bot as { welcome_message_b?: string | null }).welcome_message_b ?? null,
      ab_active: !!(bot as { welcome_message_b?: string | null }).welcome_message_b,
      results: result,
    });
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

    const body = PutBody.parse(await req.json());

    if (body.welcome_message_b) {
      await sql()`
        update public.bots
           set welcome_message_b = ${body.welcome_message_b},
               ab_test_started_at = coalesce(ab_test_started_at, now())
         where id = ${id}
      `;
    } else {
      // O'chirish — natijalarni saqlab qolib, faqat variant B'ni null qiladi
      await sql()`
        update public.bots
           set welcome_message_b = null,
               ab_test_started_at = null
         where id = ${id}
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
