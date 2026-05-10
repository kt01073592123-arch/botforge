// Bot egasi uchun CSV export.
// GET ?type=orders|customers|promo[&days=N]
// Faqat o'z botining ma'lumotlari (session-based ownership check).

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { sql } from "@/lib/db";
import { rowsToCsv, csvResponse } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "orders";
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 90)));

    const dbSql = sql();
    const stamp = new Date().toISOString().slice(0, 10);

    if (type === "orders") {
      const rows = (await dbSql`
        select id, customer_name, customer_phone, customer_tg_username,
               total_uzs, status, note, created_at, completed_at,
               items
          from public.orders
         where bot_id = ${id}
           and created_at >= now() - (${days}::int * interval '1 day')
         order by created_at desc
      `) as Array<{
        id: string;
        customer_name: string | null;
        customer_phone: string | null;
        customer_tg_username: string | null;
        total_uzs: number;
        status: string;
        note: string | null;
        created_at: string;
        completed_at: string | null;
        items: unknown;
      }>;

      const csv = rowsToCsv(
        ["Sana", "ID", "Ism", "Telefon", "Telegram", "Mahsulotlar", "Status", "Jami (so'm)", "Izoh"],
        rows.map((r) => {
          let itemsText = "";
          let arr: Array<{ name: string; qty: number; price: string }> = [];
          if (typeof r.items === "string") {
            try { arr = JSON.parse(r.items) as typeof arr; } catch { arr = []; }
          } else if (Array.isArray(r.items)) {
            arr = r.items as typeof arr;
          }
          itemsText = arr.map((it) => `${it.name} × ${it.qty}`).join("; ");
          return [
            new Date(r.created_at).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }),
            `ORD-${r.id.slice(-6).toUpperCase()}`,
            r.customer_name ?? "",
            r.customer_phone ?? "",
            r.customer_tg_username ? `@${r.customer_tg_username}` : "",
            itemsText,
            r.status,
            r.total_uzs,
            r.note ?? "",
          ];
        }),
      );
      return csvResponse(`buyurtmalar-${stamp}.csv`, csv);
    }

    if (type === "customers") {
      const rows = (await dbSql`
        select tg_user_id, display_name, phone, username, total_orders,
               total_spent_uzs, loyalty_points, last_seen_at, created_at
          from public.customer_profiles
         where bot_id = ${id}
         order by total_spent_uzs desc nulls last, created_at desc
      `) as Array<{
        tg_user_id: number | null;
        display_name: string | null;
        phone: string | null;
        username: string | null;
        total_orders: number | null;
        total_spent_uzs: string | number | null;
        loyalty_points: number | null;
        last_seen_at: string | null;
        created_at: string;
      }>;

      const csv = rowsToCsv(
        ["Ism", "Telefon", "Telegram", "TG ID", "Buyurtmalar", "Sarflandi (so'm)", "Bonus", "So'nggi faollik", "Birinchi tashrif"],
        rows.map((r) => [
          r.display_name ?? "",
          r.phone ?? "",
          r.username ? `@${r.username}` : "",
          r.tg_user_id ?? "",
          r.total_orders ?? 0,
          Number(r.total_spent_uzs ?? 0),
          r.loyalty_points ?? 0,
          r.last_seen_at ? new Date(r.last_seen_at).toLocaleString("uz-UZ") : "",
          new Date(r.created_at).toLocaleDateString("uz-UZ"),
        ]),
      );
      return csvResponse(`mijozlar-${stamp}.csv`, csv);
    }

    if (type === "promo") {
      const rows = (await dbSql`
        select pc.code, pc.discount_type, pc.discount_value, pc.used_count,
               pc.max_uses, pc.is_active, pc.valid_until, pc.created_at,
               coalesce((select sum(discount_uzs) from public.promo_code_uses pu where pu.promo_code_id = pc.id), 0) as total_discount
          from public.promo_codes pc
         where pc.bot_id = ${id}
         order by pc.created_at desc
      `) as Array<{
        code: string;
        discount_type: string;
        discount_value: number;
        used_count: number;
        max_uses: number | null;
        is_active: boolean;
        valid_until: string | null;
        created_at: string;
        total_discount: string;
      }>;

      const csv = rowsToCsv(
        ["Kod", "Turi", "Qiymat", "Ishlatilgan", "Maksimum", "Status", "Muddat", "Yaratilgan", "Jami chegirma (so'm)"],
        rows.map((r) => [
          r.code,
          r.discount_type === "percent" ? "Foiz" : "Aniq summa",
          r.discount_type === "percent" ? `${r.discount_value}%` : r.discount_value,
          r.used_count,
          r.max_uses ?? "cheksiz",
          r.is_active ? "aktiv" : "o'chiq",
          r.valid_until ? new Date(r.valid_until).toLocaleDateString("uz-UZ") : "",
          new Date(r.created_at).toLocaleDateString("uz-UZ"),
          Number(r.total_discount),
        ]),
      );
      return csvResponse(`promo-${stamp}.csv`, csv);
    }

    return NextResponse.json({ error: "type noma'lum (orders|customers|promo)" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
