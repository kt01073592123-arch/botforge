// /admin/overview — platform sog'lig'i va asosiy KPI lar.

import { getOverview } from "@/lib/admin_api";
import { cookies } from "next/headers";
import { t, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const lang = ((await cookies()).get("bf_lang")?.value ?? "uz") as Lang;
  const s = await getOverview();
  const mrrUSD = (Number(s.mrr_uzs) / 12500).toFixed(0);
  const arr = Number(s.mrr_uzs) * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 {t("adm_overview_title", lang)}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("adm_30d_stats", lang)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="MRR" value={`${Number(s.mrr_uzs).toLocaleString("uz")} so'm`} sub={`~$${mrrUSD}/${t("per_month", lang)}`} accent="green" />
        <Card title="ARR" value={`${arr.toLocaleString("uz")} so'm`} sub={t("adm_forecast", lang)} accent="green" />
        <Card title={t("adm_card_paid_subs", lang)} value={s.paid_subscriptions.toString()} sub={t("status_active", lang)} accent="blue" />
        <Card title={t("adm_card_new_users", lang)} value={s.new_users_7d.toString()} sub={t("adm_7d", lang)} accent="blue" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title={t("adm_card_users", lang)} value={s.total_users.toString()} sub={`${s.banned_users} ${t("adm_blocked_count", lang)}`} />
        <Card title={t("adm_card_bots", lang)} value={s.total_bots.toString()} sub={`${s.active_bots} ${t("status_active", lang).toLowerCase()} · ${s.paused_bots} ${t("adm_paused_badge", lang).toLowerCase()}`} />
        <Card title={t("adm_card_messages", lang)} value={s.total_messages_30d.toLocaleString("uz")} sub={t("adm_30d", lang)} />
        <Card title={t("adm_card_leads", lang)} value={s.total_leads_30d.toString()} sub={`${s.total_bookings_30d} bron, ${s.total_orders_30d} buyurtma`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title={t("adm_card_ai_cost", lang)}
          value={`$${Number(s.ai_cost_30d).toFixed(2)}`}
          sub={`${(Number(s.ai_tokens_30d) / 1_000_000).toFixed(2)}M token`}
          accent="purple"
        />
        <Card
          title={t("adm_card_webhooks", lang)}
          value={s.webhook_errors_24h.toString()}
          sub={t("adm_24h", lang)}
          accent={s.webhook_errors_24h > 10 ? "red" : "gray"}
        />
        <Card
          title={t("adm_card_margin", lang)}
          value={`${margin(s)}%`}
          sub={`MRR: $${mrrUSD} − cost: $${Number(s.ai_cost_30d).toFixed(2)}`}
          accent={Number(margin(s)) > 70 ? "green" : "yellow"}
        />
      </div>

      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-bold text-sm mb-2">💡 {t("adm_quick_actions", lang)}</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/admin/sellers" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">👥 {t("adm_nav_sellers", lang)}</a>
          <a href="/admin/bots" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">🤖 {t("adm_nav_bots", lang)}</a>
          <a href="/admin/ai-costs" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">⚡ {t("adm_nav_ai_costs", lang)}</a>
          <a href="/admin/broadcast" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">📢 {t("adm_nav_broadcast", lang)}</a>
        </div>
      </div>
    </div>
  );
}

function margin(s: { mrr_uzs: number; ai_cost_30d: number }): string {
  const mrr = Number(s.mrr_uzs) / 12500;
  if (mrr <= 0) return "—";
  const cost = Number(s.ai_cost_30d);
  return (((mrr - cost) / mrr) * 100).toFixed(0);
}

function Card({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  accent?: "green" | "blue" | "red" | "yellow" | "purple" | "gray";
}) {
  const colors: Record<string, string> = {
    green:  "bg-emerald-50 border-emerald-200 text-emerald-900",
    blue:   "bg-blue-50 border-blue-200 text-blue-900",
    red:    "bg-red-50 border-red-200 text-red-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    gray:   "bg-white border-gray-200 text-gray-900",
  };
  const cls = colors[accent ?? "gray"];
  return (
    <div className={`border rounded-lg p-4 ${cls}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}
