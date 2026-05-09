// /admin/overview — platform sog'lig'i va asosiy KPI lar.

import { getOverview } from "@/lib/admin_api";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const s = await getOverview();
  const mrrUSD = (Number(s.mrr_uzs) / 12500).toFixed(0); // approx UZS→USD
  const arr = Number(s.mrr_uzs) * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Umumiy ko'rinish</h1>
        <p className="text-sm text-gray-500 mt-1">Oxirgi 30 kun statistikasi</p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="MRR" value={`${Number(s.mrr_uzs).toLocaleString("uz")} so'm`} sub={`~$${mrrUSD}/oy`} accent="green" />
        <Card title="ARR" value={`${arr.toLocaleString("uz")} so'm`} sub="prognoz" accent="green" />
        <Card title="Pullik obunalar" value={s.paid_subscriptions.toString()} sub="aktiv" accent="blue" />
        <Card title="Yangi userlar" value={s.new_users_7d.toString()} sub="7 kunda" accent="blue" />
      </div>

      {/* Volume cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Foydalanuvchilar" value={s.total_users.toString()} sub={`${s.banned_users} bloklangan`} />
        <Card title="Botlar" value={s.total_bots.toString()} sub={`${s.active_bots} aktiv • ${s.paused_bots} pauza`} />
        <Card title="Xabarlar" value={(s.total_messages_30d).toLocaleString("uz")} sub="30 kunda" />
        <Card title="Lead'lar" value={s.total_leads_30d.toString()} sub={`${s.total_bookings_30d} bron, ${s.total_orders_30d} buyurtma`} />
      </div>

      {/* Cost cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title="AI cost (30 kun)"
          value={`$${Number(s.ai_cost_30d).toFixed(2)}`}
          sub={`${(Number(s.ai_tokens_30d) / 1_000_000).toFixed(2)}M token`}
          accent="purple"
        />
        <Card
          title="Webhook xatolar"
          value={s.webhook_errors_24h.toString()}
          sub="24 soatda"
          accent={s.webhook_errors_24h > 10 ? "red" : "gray"}
        />
        <Card
          title="Margin"
          value={`${margin(s)}%`}
          sub={`MRR: $${mrrUSD} − cost: $${Number(s.ai_cost_30d).toFixed(2)}`}
          accent={Number(margin(s)) > 70 ? "green" : "yellow"}
        />
      </div>

      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-bold text-sm mb-2">💡 Quick actions</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/admin/sellers" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">👥 Foydalanuvchilar</a>
          <a href="/admin/bots" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">🤖 Botlar</a>
          <a href="/admin/ai-costs" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">⚡ AI cost anomaliyalar</a>
          <a href="/admin/broadcast" className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50">📢 Yangi broadcast</a>
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
    green: "bg-emerald-50 border-emerald-200 text-emerald-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    red: "bg-red-50 border-red-200 text-red-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    gray: "bg-white border-gray-200 text-gray-900",
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
