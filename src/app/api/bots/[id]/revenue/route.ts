// Daromad va funnel statistikasi.
// Kunlik revenue (completed orders), top mahsulotlar, AOV, completion rate,
// engaged users → buyers conversion.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30)));

    const dbSql = sql();

    // 1) Kunlik daromad (completed orders bo'yicha)
    const daily = (await dbSql`
      with d as (
        select generate_series(
          date_trunc('day', now() - (${days}::int - 1) * interval '1 day'),
          date_trunc('day', now()),
          interval '1 day'
        )::date as day
      )
      select
        d.day::text as day,
        coalesce(sum(o.total_uzs) filter (where o.status = 'completed'), 0)::bigint as revenue_uzs,
        count(o.id) filter (where o.status = 'completed')::int as orders_completed,
        count(o.id) filter (where o.status not in ('cancelled'))::int as orders_total,
        count(o.id) filter (where o.status = 'cancelled')::int as orders_cancelled
      from d
      left join public.orders o
        on o.bot_id = ${id}
       and date_trunc('day', o.created_at)::date = d.day
      group by d.day
      order by d.day
    `) as Array<{
      day: string;
      revenue_uzs: string;
      orders_completed: number;
      orders_total: number;
      orders_cancelled: number;
    }>;

    // 2) Umumiy KPI'lar
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
    `) as Array<{
      revenue: string;
      completed: number;
      cancelled: number;
      total: number;
      aov: number;
    }>;
    const totals = totalsRow[0];

    // 3) Top 5 mahsulotlar (orders.items jsonb dan)
    const topProducts = (await dbSql`
      with items as (
        select
          (item->>'name')::text as name,
          (item->>'qty')::int as qty,
          o.total_uzs,
          o.id as order_id
        from public.orders o,
        lateral jsonb_array_elements(o.items) as item
        where o.bot_id = ${id}
          and o.status = 'completed'
          and o.created_at >= now() - (${days}::int * interval '1 day')
      )
      select
        name,
        sum(qty)::int as total_qty,
        count(distinct order_id)::int as orders_count
      from items
      where name is not null
      group by name
      order by total_qty desc
      limit 5
    `) as Array<{ name: string; total_qty: number; orders_count: number }>;

    // 4) Funnel — engaged → buyers → completed buyers
    const funnel = (await dbSql`
      select
        (select count(distinct tg_user_id)::int
           from public.conversations
          where bot_id = ${id}
            and tg_user_id is not null
            and created_at >= now() - (${days}::int * interval '1 day')) as engaged_users,
        (select count(distinct customer_tg_id)::int
           from public.orders
          where bot_id = ${id}
            and customer_tg_id is not null
            and created_at >= now() - (${days}::int * interval '1 day')) as buyers,
        (select count(distinct customer_tg_id)::int
           from public.orders
          where bot_id = ${id}
            and customer_tg_id is not null
            and status = 'completed'
            and created_at >= now() - (${days}::int * interval '1 day')) as completed_buyers
    `) as Array<{ engaged_users: number; buyers: number; completed_buyers: number }>;

    // 5) Promo statistika (oxirgi N kun)
    const promoStats = (await dbSql`
      select
        coalesce(sum(discount_uzs), 0)::bigint as total_discount,
        count(*)::int as uses_count,
        count(distinct promo_code_id)::int as codes_used
      from public.promo_code_uses
       where bot_id = ${id}
         and created_at >= now() - (${days}::int * interval '1 day')
    `) as Array<{ total_discount: string; uses_count: number; codes_used: number }>;

    return NextResponse.json({
      days,
      daily: daily.map((r) => ({ ...r, revenue_uzs: Number(r.revenue_uzs) })),
      totals: {
        revenue_uzs: Number(totals?.revenue ?? 0),
        orders_completed: totals?.completed ?? 0,
        orders_cancelled: totals?.cancelled ?? 0,
        orders_total: totals?.total ?? 0,
        aov_uzs: totals?.aov ?? 0,
        completion_rate:
          (totals?.total ?? 0) > 0
            ? Math.round(((totals?.completed ?? 0) / (totals?.total ?? 1)) * 100)
            : 0,
      },
      top_products: topProducts,
      funnel: {
        engaged_users: funnel[0]?.engaged_users ?? 0,
        buyers: funnel[0]?.buyers ?? 0,
        completed_buyers: funnel[0]?.completed_buyers ?? 0,
        engagement_to_buyer_pct:
          (funnel[0]?.engaged_users ?? 0) > 0
            ? Math.round(((funnel[0]?.buyers ?? 0) / (funnel[0]?.engaged_users ?? 1)) * 100)
            : 0,
        buyer_to_completion_pct:
          (funnel[0]?.buyers ?? 0) > 0
            ? Math.round(((funnel[0]?.completed_buyers ?? 0) / (funnel[0]?.buyers ?? 1)) * 100)
            : 0,
      },
      promo: {
        total_discount_uzs: Number(promoStats[0]?.total_discount ?? 0),
        uses_count: promoStats[0]?.uses_count ?? 0,
        codes_used: promoStats[0]?.codes_used ?? 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
