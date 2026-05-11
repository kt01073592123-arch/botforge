// Seller Mini App: buyurtmalar — list + status o'zgartirish.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySellerForBot } from "@/lib/seller_auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statuses = url.searchParams.getAll("status");

  const dbSql = sql();
  const rows = (statuses.length > 0
    ? await dbSql`
        select * from public.orders
         where bot_id = ${id} and status = any(${statuses})
         order by created_at desc
         limit 100
      `
    : await dbSql`
        select * from public.orders
         where bot_id = ${id}
         order by created_at desc
         limit 100
      `) as Array<{
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    customer_tg_username: string | null;
    items: unknown;
    total_uzs: number;
    status: string;
    note: string | null;
    created_at: string;
  }>;

  return NextResponse.json({
    orders: rows.map((r) => {
      let items: unknown[] = [];
      if (typeof r.items === "string") {
        try { items = JSON.parse(r.items); } catch {}
      } else if (Array.isArray(r.items)) {
        items = r.items;
      }
      return { ...r, items };
    }),
  });
}

const PatchBody = z.object({
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId kerak" }, { status: 400 });
  }
  try {
    const body = PatchBody.parse(await req.json());
    await sql()`
      update public.orders set
        status = ${body.status},
        completed_at = ${body.status === "completed" ? new Date().toISOString() : null}
       where id = ${orderId} and bot_id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
