// /admin/system — webhook xatolari, rate limit, DB sog'lig'i.

import { getSystemHealth } from "@/lib/admin_api";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const h = await getSystemHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔧 Tizim sog'lig'i</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time texnik holat</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card
          title="Webhook xatolar (24h)"
          value={h.webhook_errors_24h}
          accent={h.webhook_errors_24h > 50 ? "red" : h.webhook_errors_24h > 10 ? "yellow" : "green"}
        />
        <Card title="Rate limit aktiv" value={h.rate_limit_active} sub="oxirgi 1 daq" />
        <Card title="So'nggi xatolar" value={h.recent_errors.length} sub="oxirgi 24h" />
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 border-b font-bold">📋 So'nggi webhook xatolar</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Vaqt</th>
              <th className="px-3 py-2 text-left">Bot ID</th>
              <th className="px-3 py-2 text-left">Xato</th>
            </tr>
          </thead>
          <tbody>
            {h.recent_errors.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString("uz")}
                </td>
                <td className="px-3 py-2 text-xs font-mono">{e.bot_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-xs text-red-600 font-mono">
                  {e.error?.slice(0, 200)}
                </td>
              </tr>
            ))}
            {h.recent_errors.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-12 text-center text-emerald-600">
                  ✅ Webhook xatolari yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: number;
  sub?: string;
  accent?: "green" | "yellow" | "red";
}) {
  const colors: Record<string, string> = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  return (
    <div className={`border rounded-lg p-4 ${accent ? colors[accent] : "bg-white"}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );
}
