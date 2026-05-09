// Admin auth — faqat is_admin = true bo'lgan userlar /admin/* ga kira oladi.

import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { db } from "./supabase/server";

export type AdminUser = {
  id: string;
  telegram_id: number;
  first_name: string | null;
};

export async function requireAdmin(): Promise<
  | { ok: true; user: AdminUser }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: new NextResponse("unauthorized", { status: 401 }),
    };
  }

  const { data } = await db()
    .from("app_users")
    .select("id, telegram_id, first_name, is_admin, banned_at")
    .eq("id", session.uid)
    .maybeSingle();

  if (!data || !(data as { is_admin: boolean }).is_admin) {
    return {
      ok: false,
      response: new NextResponse("forbidden", { status: 403 }),
    };
  }
  if ((data as { banned_at: string | null }).banned_at) {
    return {
      ok: false,
      response: new NextResponse("banned", { status: 403 }),
    };
  }

  return {
    ok: true,
    user: {
      id: (data as { id: string }).id,
      telegram_id: (data as { telegram_id: number }).telegram_id,
      first_name: (data as { first_name: string | null }).first_name,
    },
  };
}

// Audit log helper
export async function logAdminAction(opts: {
  actorUserId: string;
  actorTelegramId?: number;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await db().from("audit_logs").insert({
      actor_user_id: opts.actorUserId,
      actor_telegram_id: opts.actorTelegramId,
      action: opts.action,
      target_type: opts.targetType,
      target_id: opts.targetId,
      details: opts.details ?? {},
      ip: opts.ip,
    });
  } catch (e) {
    console.error("[audit log]", (e as Error).message);
  }
}

// React server component'larda ishlatish (page.tsx)
export async function pageRequireAdmin(): Promise<AdminUser | null> {
  const r = await requireAdmin();
  if (!r.ok) return null;
  return r.user;
}
