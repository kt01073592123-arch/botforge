// /admin/bots — barcha botlar ro'yxati. Owner, AI cost, status, message limit.

import Link from "next/link";
import { listBots } from "@/lib/admin_api";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
};

export default async function BotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const bots = await listBots({ search: sp.q, status: sp.status, limit: 200 });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">🤖 Barcha botlar</h1>
          <p className="text-sm text-gray-500 mt-1">{bots.length} ta natija</p>
        </div>
        <form className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="@bot_username"
            className="border rounded px-3 py-2 text-sm w-48"
          />
          <select name="status" defaultValue={sp.status ?? ""} className="border rounded px-3 py-2 text-sm">
            <option value="">Barcha status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="error">Error</option>
          </select>
          <button className="px-3 py-2 bg-gray-900 text-white rounded text-sm">Filtr</button>
        </form>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Bot</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Xabarlar</th>
              <th className="px-3 py-2 text-right">Cost (30d)</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Yaratilgan</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b) => {
              const usagePct = Math.round((b.monthly_messages_used / b.monthly_message_limit) * 100);
              return (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{b.business_name ?? b.name}</div>
                    {b.tg_username && (
                      <a
                        href={`https://t.me/${b.tg_username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        @{b.tg_username}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <Link href={`/admin/sellers?q=${b.owner_telegram_id}`} className="hover:underline">
                      {b.owner_name ?? "—"}
                    </Link>
                    {b.owner_telegram_id && (
                      <div className="text-gray-400">{b.owner_telegram_id}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        STATUS_BADGE[b.status] ?? STATUS_BADGE.draft
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="text-xs">
                      {b.monthly_messages_used.toLocaleString("uz")} / {b.monthly_message_limit.toLocaleString("uz")}
                    </div>
                    <div className="w-24 ml-auto bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-yellow-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(usagePct, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={Number(b.cost_30d) > 5 ? "font-bold text-red-600" : ""}>
                      ${Number(b.cost_30d).toFixed(3)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 font-mono">{b.ai_model}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{shortDate(b.created_at)}</td>
                </tr>
              );
            })}
            {bots.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-gray-400">
                  Botlar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz");
}
