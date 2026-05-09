// /admin/audit — barcha admin amallari log'i.

import { listAuditLogs } from "@/lib/admin_api";

export const dynamic = "force-dynamic";

const ACTION_BADGE: Record<string, string> = {
  user_banned: "bg-red-100 text-red-700",
  user_unbanned: "bg-emerald-100 text-emerald-700",
  plan_changed: "bg-blue-100 text-blue-700",
  broadcast_sent: "bg-purple-100 text-purple-700",
  bot_paused: "bg-yellow-100 text-yellow-700",
};

export default async function AuditPage() {
  const logs = await listAuditLogs(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📜 Audit log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hamma admin amallari bu yerda yoziladi (oxirgi 200)
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Vaqt</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Amal</th>
              <th className="px-3 py-2 text-left">Maqsad</th>
              <th className="px-3 py-2 text-left">Tafsilot</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString("uz")}
                </td>
                <td className="px-3 py-2 text-xs">
                  {l.actor_telegram_id ? `@${l.actor_telegram_id}` : "system"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      ACTION_BADGE[l.action] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {l.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {l.target_type && (
                    <span className="text-gray-500">{l.target_type}: </span>
                  )}
                  <span className="font-mono">{l.target_id?.slice(0, 12) ?? "—"}</span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 font-mono max-w-md truncate">
                  {Object.keys(l.details ?? {}).length > 0
                    ? JSON.stringify(l.details)
                    : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-gray-400">
                  Hali log yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
