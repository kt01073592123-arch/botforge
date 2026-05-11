// Seller Mini App: promo kodlar CRUD.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySellerForBot } from "@/lib/seller_auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, "Faqat harf, raqam"),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().positive(),
  min_order_uzs: z.number().int().positive().optional(),
  max_uses: z.number().int().positive().optional(),
  valid_until: z.string().datetime().optional(),
  description: z.string().max(200).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await sql()`
    select * from public.promo_codes
     where bot_id = ${id}
     order by created_at desc
     limit 100
  `;
  return NextResponse.json({ codes: rows });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = CreateBody.parse(await req.json());
    if (body.discount_type === "percent" && body.discount_value > 100) {
      return NextResponse.json({ error: "Foiz 100'dan oshmasin" }, { status: 400 });
    }
    const rows = await sql()`
      insert into public.promo_codes (
        bot_id, code, discount_type, discount_value,
        min_order_uzs, max_uses, valid_until, description
      ) values (
        ${id}, ${body.code.toUpperCase()}, ${body.discount_type}, ${body.discount_value},
        ${body.min_order_uzs ?? null}, ${body.max_uses ?? null},
        ${body.valid_until ?? null}, ${body.description ?? null}
      )
      returning *
    `;
    return NextResponse.json({ code: rows[0] });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "Bu kod mavjud" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const codeId = new URL(req.url).searchParams.get("codeId");
  if (!codeId) return NextResponse.json({ error: "codeId kerak" }, { status: 400 });
  await sql()`delete from public.promo_codes where id = ${codeId} and bot_id = ${id}`;
  return NextResponse.json({ ok: true });
}
