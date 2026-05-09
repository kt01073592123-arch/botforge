// /admin/sellers/[id] — bitta seller batafsil sahifa.
// Profil + botlari + plan + plan o'zgartirish + ban tugmasi.

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/supabase/server";
import { logAdminAction, requireAdmin } from "@/lib/admin_auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function changePlan(formData: FormData) {
  "use server";
  const auth = await requireAdmin();
  if (!auth.ok) throw new Error("forbidden");

  const userId = formData.get("user_id") as string;
  const planId = formData.get("plan_id") as string;
  if (!userId || !planId) return;

  await db().rpc("upgrade_subscription", {
    p_user_id: userId,
    p_plan_id: planId,
    p_period_days: 30,
  });

  await logAdminAction({
    actorUserId: auth.user.id,
    actorTelegramId: auth.user.telegram_id,
    action: "plan_changed",
    targetType: "user",
    targetId: userId,
    details: { plan: planId },
  });

  revalidatePath(`/admin/sellers/${userId}`);
}

export default async function SellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = db();

  const { data: user } = await sb.from("app_users").select("*").eq("id", id).maybeSingle();
  if (!user) notFound();

  const u = user as Record<string, unknown>;

  const [{ data: bots }, { data: sub }, { data: plans }, { data: payments }] =
    await Promise.all([
      sb
        .from("bots")
        .select("id, name, business_name, tg_username, status, monthly_messages_used, monthly_message_limit, created_at")
        .eq("owner_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      sb.from("subscriptions").select("plan_id, current_period_end, active").eq("user_id", id).maybeSingle(),
      sb.from("plans").select("id, name, price_uzs").order("sort_order"),
      sb.from("payments").select("amount_uzs, paid_at, status, plan_id").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/sellers" className="text-sm text-gray-500 hover:text-gray-700">
        ← Foydalanuvchilar ro'yxati
      </Link>

      <div className="border rounded-lg p-6 bg-white">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{(u.first_name as string) ?? "—"}</h1>
            <div className="text-sm text-gray-500 mt-1">
              ID: <span className="font-mono">{u.telegram_id as number}</span>
              {(u.telegram_username as string) && (
                <>
                  {" · "}
                  <a
                    href={`https://t.me/${u.telegram_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    @{u.telegram_username as string}
                  </a>
                </>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Ro'yxatdan o'tgan: {new Date(u.created_at as string).toLocaleString("uz")}
              {" · "}
              Oxirgi marta: {new Date(u.last_seen_at as string).toLocaleString("uz")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {(u.is_admin as boolean) && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">ADMIN</span>
            )}
            {(u.banned_at as string | null) ? (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                🚫 Bloklangan
              </span>
            ) : (
              <span className="text-xs text-emerald-600">✓ Aktiv</span>
            )}
            <form action={`/api/admin/users/${id}/ban`} method="POST">
              <input type="hidden" name="action" value={(u.banned_at as string | null) ? "unban" : "ban"} />
              <button
                className={`text-xs px-3 py-1.5 border rounded ${
                  (u.banned_at as string | null) ? "text-emerald-600 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"
                }`}
              >
                {(u.banned_at as string | null) ? "Tiklash" : "Bloklash"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Plan management */}
      <div className="border rounded-lg p-5 bg-white">
        <h2 className="font-bold mb-3">💎 Tarif</h2>
        <div className="text-sm text-gray-600 mb-3">
          Hozirgi: <strong>{(sub as { plan_id: string } | null)?.plan_id ?? "free"}</strong>
          {(sub as { current_period_end?: string } | null)?.current_period_end && (
            <span className="text-gray-400">
              {" "}— amal qilish: {new Date((sub as { current_period_end: string }).current_period_end).toLocaleDateString("uz")}
            </span>
          )}
        </div>
        <form action={changePlan} className="flex gap-2 items-end">
          <input type="hidden" name="user_id" value={id} />
          <div>
            <label className="text-xs text-gray-600">Yangi plan</label>
            <select name="plan_id" defaultValue={(sub as { plan_id: string } | null)?.plan_id ?? "free"} className="block mt-1 border rounded px-3 py-1.5 text-sm">
              {((plans ?? []) as Array<{ id: string; name: string; price_uzs: number }>).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price_uzs.toLocaleString("uz")} so'm/oy
                </option>
              ))}
            </select>
          </div>
          <button className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded">O'zgartirish</button>
        </form>
      </div>

      {/* Bots */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 border-b font-bold">🤖 Botlar ({(bots ?? []).length})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Nomi</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Xabarlar</th>
              <th className="px-3 py-2 text-left">Yaratilgan</th>
            </tr>
          </thead>
          <tbody>
            {((bots ?? []) as Array<Record<string, unknown>>).map((b) => (
              <tr key={b.id as string} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-semibold">{(b.business_name as string) ?? (b.name as string)}</div>
                  {(b.tg_username as string) && (
                    <div className="text-xs text-gray-400">@{b.tg_username as string}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{b.status as string}</td>
                <td className="px-3 py-2 text-right text-xs">
                  {(b.monthly_messages_used as number).toLocaleString("uz")} / {(b.monthly_message_limit as number).toLocaleString("uz")}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(b.created_at as string).toLocaleDateString("uz")}
                </td>
              </tr>
            ))}
            {(bots ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  Botlar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payments */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 border-b font-bold">💳 To'lovlar tarixi</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Sana</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-right">Summa</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {((payments ?? []) as Array<Record<string, unknown>>).map((p, i) => (
              <tr key={i} className="border-b">
                <td className="px-3 py-2 text-xs">
                  {p.paid_at ? new Date(p.paid_at as string).toLocaleString("uz") : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{p.plan_id as string}</td>
                <td className="px-3 py-2 text-right">{(p.amount_uzs as number).toLocaleString("uz")} so'm</td>
                <td className="px-3 py-2 text-xs">{p.status as string}</td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  To'lovlar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
