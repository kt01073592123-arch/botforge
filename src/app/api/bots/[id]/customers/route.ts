// CRM — bot mijozlarining ro‘yxati va profili.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getBot } from "@/lib/bots";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const search = url.searchParams.get("q");

    let q = db()
      .from("customer_profiles")
      .select("*")
      .eq("bot_id", id)
      .order("last_seen_at", { ascending: false })
      .limit(200);

    const { data } = await q;
    let items = (data ?? []) as Array<{
      id: string;
      tg_user_id: number;
      display_name: string | null;
      phone: string | null;
      username: string | null;
      tags: string[] | string;
      total_orders: number;
      total_spent_uzs: number;
      loyalty_points: number;
      last_seen_at: string;
    }>;

    // jsonb-text array — postgres-driver string sifatida qaytishi mumkin
    items = items.map((c) => ({
      ...c,
      tags: Array.isArray(c.tags)
        ? c.tags
        : typeof c.tags === "string"
        ? (() => {
            // text[] PostgreSQL formatda yoki JSON string bo‘lishi mumkin
            const s = c.tags as string;
            if (s.startsWith("{") && s.endsWith("}")) {
              // PostgreSQL array format: {tag1,tag2}
              return s.slice(1, -1).split(",").map((t) => t.trim()).filter(Boolean);
            }
            try {
              return JSON.parse(s);
            } catch {
              return [];
            }
          })()
        : [],
      total_spent_uzs: Number(c.total_spent_uzs ?? 0),
      total_orders: Number(c.total_orders ?? 0),
      loyalty_points: Number(c.loyalty_points ?? 0),
    }));

    if (search) {
      const lower = search.toLowerCase();
      items = items.filter(
        (c) =>
          (c.display_name ?? "").toLowerCase().includes(lower) ||
          (c.phone ?? "").includes(lower) ||
          (c.username ?? "").toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({ customers: items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

const PatchBody = z.object({
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSession();
    const { id } = await ctx.params;
    const bot = await getBot(s.uid, id);
    if (!bot) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    if (!customerId) return NextResponse.json({ error: "customerId kerak" }, { status: 400 });

    const body = PatchBody.parse(await req.json());

    // tags array uchun raw SQL kerak
    const sql = (await import("@/lib/db")).sql();
    if (body.tags !== undefined) {
      await sql`update customer_profiles
                set tags = ${body.tags as string[]},
                    last_seen_at = now()
                where id = ${customerId} and bot_id = ${id}`;
    }
    if (body.notes !== undefined) {
      await sql`update customer_profiles
                set notes = ${body.notes}
                where id = ${customerId} and bot_id = ${id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
