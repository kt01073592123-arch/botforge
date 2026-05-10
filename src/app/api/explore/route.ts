// Marketplace: ochiq botlar ro'yxati.
// GET ?q=&category=&limit=&offset=

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExploreItem = {
  id: string;
  business_name: string;
  description: string | null;
  tg_username: string;
  icon: string;
  category: string | null;
  vertical: string | null;
  brand_kit: { primary_color?: string; accent_color?: string; gradient?: string } | null;
  total_reviews: number;
  avg_rating: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = url.searchParams.get("category");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  const dbSql = sql();
  const rows = (await dbSql`
    select
      b.id,
      b.business_name,
      b.description,
      b.tg_username,
      coalesce(t.icon, '🤖') as icon,
      b.explore_category as category,
      t.vertical,
      t.brand_kit,
      coalesce((select count(*)::int from public.reviews r where r.bot_id = b.id and r.is_published), 0) as total_reviews,
      coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.bot_id = b.id and r.is_published), 0) as avg_rating
    from public.bots b
    left join public.bot_templates t on t.id = b.template_id
    where b.is_public = true
      and b.deleted_at is null
      and b.status = 'active'
      and b.tg_username is not null
      ${q ? dbSql`and (lower(b.business_name) like ${"%" + q + "%"} or lower(coalesce(b.description, '')) like ${"%" + q + "%"})` : dbSql``}
      ${category ? dbSql`and (b.explore_category = ${category} or t.vertical = ${category})` : dbSql``}
    order by b.created_at desc
    limit ${limit}
    offset ${offset}
  `) as unknown as ExploreItem[];

  // Top categories (counts) — for category filter UI
  const cats = (await dbSql`
    select
      coalesce(b.explore_category, t.vertical, 'other') as category,
      count(*)::int as count
    from public.bots b
    left join public.bot_templates t on t.id = b.template_id
    where b.is_public = true and b.deleted_at is null and b.status = 'active'
    group by 1
    order by count desc
    limit 20
  `) as Array<{ category: string; count: number }>;

  return NextResponse.json({
    items: rows.map((r) => ({
      ...r,
      avg_rating: Number(r.avg_rating ?? 0),
    })),
    categories: cats,
    has_more: rows.length === limit,
  });
}
