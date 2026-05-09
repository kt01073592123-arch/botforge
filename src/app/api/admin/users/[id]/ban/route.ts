// POST /api/admin/users/[id]/ban — ban yoki unban user.
// Form-data action=ban|unban kabul qiladi (default: ban).

import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin_auth";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const action = (form?.get("action") as string) ?? "ban";

  if (id === auth.user.id) {
    return NextResponse.json({ error: "cant_ban_self" }, { status: 400 });
  }

  const sb = db();
  if (action === "unban") {
    await sb
      .from("app_users")
      .update({ banned_at: null, ban_reason: null })
      .eq("id", id);
    await logAdminAction({
      actorUserId: auth.user.id,
      actorTelegramId: auth.user.telegram_id,
      action: "user_unbanned",
      targetType: "user",
      targetId: id,
    });
  } else {
    const reason = (form?.get("reason") as string) ?? null;
    await sb
      .from("app_users")
      .update({ banned_at: new Date().toISOString(), ban_reason: reason })
      .eq("id", id);

    // Bot egasining bot'larini ham pause qilish
    await sb.from("bots").update({ status: "paused" }).eq("owner_id", id);

    await logAdminAction({
      actorUserId: auth.user.id,
      actorTelegramId: auth.user.telegram_id,
      action: "user_banned",
      targetType: "user",
      targetId: id,
      details: { reason },
    });
  }

  // Form'dan kelsa redirect, fetch'dan kelsa JSON
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ ok: true, action });
  }
  return NextResponse.redirect(new URL("/admin/sellers", req.url), { status: 303 });
}
