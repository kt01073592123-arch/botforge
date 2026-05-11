// Seller Mini App: mahsulot CRUD.
// GET: barcha mahsulotlar
// PUT: services array (to'liq almashtirish) + kategoriyalar

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySellerForBot } from "@/lib/seller_auth";
import { sql } from "@/lib/db";
import { updateBotData } from "@/lib/bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ServiceItem = z.object({
  name: z.string().min(1).max(200),
  price: z.string().max(60),
  duration: z.string().max(60).optional(),
  description: z.string().max(1000).optional(),
  photo_url: z.string().url().max(1000).optional(),
  category_id: z.string().max(80).optional(),
  in_stock: z.boolean().optional(),
});

const Body = z.object({
  services: z.array(ServiceItem).max(500),
  categories: z
    .array(
      z.object({
        id: z.string().max(80),
        name: z.string().min(1).max(80),
        position: z.number().optional(),
        icon: z.string().max(8).optional(),
      }),
    )
    .max(50)
    .optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = (await sql()`
    select services, categories from public.bot_data where bot_id = ${id}
  `) as Array<{ services: unknown; categories: unknown }>;

  function jp(v: unknown): unknown {
    if (typeof v === "string") {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  }

  return NextResponse.json({
    services: (jp(rows[0]?.services) as unknown[]) ?? [],
    categories: (jp(rows[0]?.categories) as unknown[]) ?? [],
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = Body.parse(await req.json());
    await updateBotData(id, {
      services: body.services,
      categories: body.categories,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
