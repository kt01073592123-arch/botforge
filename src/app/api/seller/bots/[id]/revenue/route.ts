// Seller Mini App: daromad (mavjud revenue endpoint'ning auth-shimmed versiya).

import { NextResponse } from "next/server";
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

  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("days") ?? 30)));
  const dbSql = sql();

  const totalsRow = (await dbSql`
    select
      coalesce(sum(total_uzs) filter (where status = 'completed'), 0)::bigint as revenue,
      count(*) filter (where status = 'completed')::int as completed,
      count(*) filter (where status = 'cancelled')::int as cancelled,
      count(*)::int as total,
      coalesce(avg(total_uzs) filter (where status = 'completed'), 0)::int as aov
    from public.orders
     where bot_id = ${id}
       and created_at >= now() - (${days}::int * interval '1 day')
  `) as Array<{ revenue: string; completed: number; cancelled: number; total: number; aov: number }>;

  const topProducts = (await dbSql`
    with items as (
      select (item->>'name')::text as name, (item->>'qty')::int as qty, o.id as order_id
        from public.orders o, lateral jsonb_array_elements(o.items) as item
       where o.bot_id = ${id} and o.status = 'completed'
         and o.created_at >= now() - (${days}::int * interval '1 day')
    )
    select name, sum(qty)::int as total_qty, count(distinct order_id)::int as orders_count
      from items where name is not null
      group by name order by total_qty desc limit 5
  `) as Array<{ name: string; total_qty: number; orders_count: number }>;

  const totals = totalsRow[0];
  return NextResponse.json({
    totals: {
      revenue_uzs: Number(totals?.revenue ?? 0),
      orders_completed: totals?.completed ?? 0,
      orders_cancelled: totals?.cancelled ?? 0,
      orders_total: totals?.total ?? 0,
      aov_uzs: totals?.aov ?? 0,
    },
    top_products: topProducts,
  });
}
