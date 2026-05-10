// Promo kodlar — bot egasi uchun CRUD.
// GET: list
// POST: yangi kod yaratish
// DELETE: ?codeId=... — kodni o'chirish

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PromoRow = {
  id: string;
  bot_id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_uzs: number | null;
  max_uses: number | null;
  used_count: number;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

const CreateBody = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Faqat harf, raqam, _, -"),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().positive(),
  min_order_uzs: z.number().int().positive().optional(),
  max_uses: z.number().int().positive().optional(),
  valid_until: z.string().datetime().optional(),
  description: z.string().max(200).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const rows = (await sql()`
      select * from public.promo_codes
       where bot_id = ${id}
       order by created_at desc
       limit 100
    `) as unknown as PromoRow[];
    return NextResponse.json({ codes: rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const body = CreateBody.parse(await req.json());
    if (body.discount_type === "percent" && body.discount_value > 100) {
      return NextResponse.json({ error: "Foiz 100'dan oshmasligi kerak" }, { status: 400 });
    }

    try {
      const rows = (await sql()`
        insert into public.promo_codes (
          bot_id, code, discount_type, discount_value,
          min_order_uzs, max_uses, valid_until, description
        ) values (
          ${id}, ${body.code.toUpperCase()}, ${body.discount_type}, ${body.discount_value},
          ${body.min_order_uzs ?? null}, ${body.max_uses ?? null},
          ${body.valid_until ?? null}, ${body.description ?? null}
        )
        returning *
      `) as unknown as PromoRow[];
      return NextResponse.json({ code: rows[0] });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return NextResponse.json({ error: "Bu kod allaqachon mavjud" }, { status: 400 });
      }
      throw e;
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const codeId = new URL(req.url).searchParams.get("codeId");
    if (!codeId) return NextResponse.json({ error: "codeId kerak" }, { status: 400 });

    await sql()`
      delete from public.promo_codes
       where id = ${codeId} and bot_id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
