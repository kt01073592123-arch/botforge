// Seller Mini App: bot egasining barcha botlari ro'yxati.
// GET: { init_data: string } header (X-Init-Data) yoki query

import { NextResponse } from "next/server";
import { verifySeller } from "@/lib/seller_auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const initData = req.headers.get("x-init-data") ?? "";
  const session = await verifySeller(initData);
  if (!session) {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }

  const dbSql = sql();
  const baseQuery = (ownerFilter: boolean) => dbSql`
    select b.id, b.name, b.business_name, b.tg_username, b.status, b.created_at,
           t.icon, t.vertical,
           (select count(*)::int from public.orders o
             where o.bot_id = b.id
               and o.created_at >= now() - interval '30 days'
               and o.status not in ('cancelled')) as orders_30d,
           (select coalesce(sum(total_uzs), 0)::bigint from public.orders o
             where o.bot_id = b.id and o.status = 'completed'
               and o.created_at >= now() - interval '30 days') as revenue_30d
      from public.bots b
      left join public.bot_templates t on t.id = b.template_id
     where ${ownerFilter ? dbSql`b.owner_id = ${session.appUserId}` : dbSql`true`}
       and b.deleted_at is null
     order by b.created_at desc
     limit 50
  `;
  // Admin'lar barcha bot'larni ko'radi, oddiy seller'lar faqat o'zinikini.
  const rows = (await baseQuery(!session.isAdmin)) as unknown as Array<{
    id: string;
    name: string;
    business_name: string | null;
    tg_username: string | null;
    status: string;
    created_at: string;
    icon: string | null;
    vertical: string | null;
    orders_30d: number;
    revenue_30d: string;
  }>;

  return NextResponse.json({
    user: session.user,
    bots: rows.map((r) => ({ ...r, revenue_30d: Number(r.revenue_30d) })),
  });
}
