// Seller Mini App: AI rasm (Unsplash/Replicate/Picsum) — initData auth bilan.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySellerForBot } from "@/lib/seller_auth";
import { generateProductImage } from "@/lib/design/product_image";
import { sql } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  productName: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const initData = req.headers.get("x-init-data") ?? "";
  const { id } = await ctx.params;
  const auth = await verifySellerForBot(initData, id);
  if (!auth || !auth.ownerOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await rateLimit({
    scope: "api_user",
    key: `seller_gen_image|${auth.session.appUserId}`,
    windowSeconds: 60,
    limit: 20,
  });
  if (!ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  try {
    const body = Body.parse(await req.json());
    const rows = (await sql()`
      select t.vertical
        from public.bots b
        left join public.bot_templates t on t.id = b.template_id
       where b.id = ${id}
    `) as Array<{ vertical: string | null }>;
    const vertical = rows[0]?.vertical ?? undefined;

    const result = await generateProductImage(
      {
        productName: body.productName,
        description: body.description,
        vertical: vertical ?? undefined,
      },
      id,
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
