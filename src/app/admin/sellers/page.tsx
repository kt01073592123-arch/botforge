// /admin/sellers — barcha foydalanuvchilar (bot egalari) ro'yxati.

import Link from "next/link";
import { cookies } from "next/headers";
import { listSellers } from "@/lib/admin_api";
import { t, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PLAN_BADGE: Record<string, string> = {
  free:  "bg-gray-100 text-gray-700",
  start: "bg-blue-100 text-blue-700",
  pro:   "bg-purple-100 text-purple-700",
  max:   "bg-yellow-100 text-yellow-800",
};

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const lang = ((await cookies()).get("bf_lang")?.value ?? "uz") as Lang;
  const sp = await searchParams;
  const sellers = await listSellers({ search: sp.q, limit: 200 });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">👥 {t("adm_sellers_title", lang)}</h1>
          <p className="text-sm text-gray-500 mt-1">{sellers.length} {t("adm_results", lang)}</p>
        </div>
        <form className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={t("adm_search_ph_seller", lang)}
            className="border rounded px-3 py-2 text-sm w-64"
          />
          <button className="px-3 py-2 bg-gray-900 text-white rounded text-sm">{t("adm_search", lang)}</button>
        </form>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">{t("adm_col_user", lang)}</th>
              <th className="px-3 py-2 text-left">Telegram</th>
              <th className="px-3 py-2 text-left">{t("adm_col_plan", lang)}</th>
              <th className="px-3 py-2 text-center">{t("adm_card_bots", lang)}</th>
              <th className="px-3 py-2 text-left">{t("adm_col_last_seen", lang)}</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">{t("adm_col_action", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-semibold">{u.first_name ?? "—"}</div>
                  {u.is_admin && (
                    <span className="text-[10px] px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded">ADMIN</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div>{u.telegram_id}</div>
                  {u.telegram_username && (
                    <a
                      href={`https://t.me/${u.telegram_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      @{u.telegram_username}
                    </a>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${PLAN_BADGE[u.plan_id ?? "free"] ?? PLAN_BADGE.free}`}>
                    {(u.plan_id ?? "free").toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-bold">{u.bot_count}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{timeAgo(u.last_seen_at, lang)}</td>
                <td className="px-3 py-2">
                  {u.banned_at ? (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                      {t("adm_status_banned", lang)}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600">{t("adm_active_badge", lang)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <SellerActions
                    id={u.id}
                    banned={!!u.banned_at}
                    labelDetails={t("adm_details", lang)}
                    labelBan={t("adm_ban", lang)}
                    labelUnban={t("adm_unban", lang)}
                  />
                </td>
              </tr>
            ))}
            {sellers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-gray-400">
                  {t("adm_not_found", lang)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SellerActions({
  id,
  banned,
  labelDetails,
  labelBan,
  labelUnban,
}: {
  id: string;
  banned: boolean;
  labelDetails: string;
  labelBan: string;
  labelUnban: string;
}) {
  return (
    <div className="flex gap-1 justify-end">
      <Link href={`/admin/sellers/${id}`} className="text-xs px-2 py-1 border rounded hover:bg-gray-100">
        {labelDetails}
      </Link>
      <form action={`/api/admin/users/${id}/ban`} method="POST" className="inline">
        <input type="hidden" name="action" value={banned ? "unban" : "ban"} />
        <button
          type="submit"
          className={`text-xs px-2 py-1 border rounded ${
            banned ? "text-emerald-600 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"
          }`}
        >
          {banned ? labelUnban : labelBan}
        </button>
      </form>
    </div>
  );
}

function timeAgo(iso: string, lang: Lang): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (lang === "ru") {
    if (m < 1) return "только что";
    if (m < 60) return `${m} мин назад`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ч назад`;
    return `${Math.floor(h / 24)} дн назад`;
  }
  if (lang === "en") {
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}
