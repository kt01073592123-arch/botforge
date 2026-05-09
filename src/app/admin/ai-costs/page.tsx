// /admin/ai-costs — AI cost monitoring + anomaliyalar.

import Link from "next/link";
import { getAnomalies, getTopAiCostBots } from "@/lib/admin_api";

export const dynamic = "force-dynamic";

export default async function AiCostsPage() {
  const [anomalies, topSpenders] = await Promise.all([
    getAnomalies(3.0),
    getTopAiCostBots(30, 30),
  ]);

  const totalCost = topSpenders.reduce((s, b) => s + b.total_cost_usd, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">⚡ AI cost monitoring</h1>
        <p className="text-sm text-gray-500 mt-1">
          Top spenders va anomaliya botlar (oxirgi 24 soat / 7 kun o'rtacha &gt; 3x)
        </p>
      </div>

      {/* Anomalies */}
      <div className="border rounded-lg p-4 bg-red-50 border-red-200">
        <h2 className="font-bold flex items-center gap-2">
          🚨 Anomaliyalar — {anomalies.length} ta bot
        </h2>
        <p className="text-xs text-gray-600 mt-1">
          Bu botlarning cost'i 7 kunlik o'rtachadan 3x yuqori — kompromis yoki hujum bo'lishi mumkin.
        </p>
        {anomalies.length === 0 ? (
          <p className="mt-4 text-sm text-emerald-700">✅ Anomaliya yo'q, hammasi tartibda.</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            {anomalies.map((a) => (
              <div
                key={a.bot_id}
                className="flex items-center gap-3 bg-white rounded p-2 text-sm border border-red-200"
              >
                <div className="flex-1">
                  <Link href={`/admin/bots?q=${a.bot_id}`} className="font-semibold hover:underline">
                    {a.bot_name ?? a.bot_id.slice(0, 8)}
                  </Link>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-bold">${Number(a.cost_24h).toFixed(3)} / 24h</div>
                  <div className="text-xs text-gray-500">
                    o'rtacha: ${Number(a.avg_cost_7d).toFixed(3)} / kun
                  </div>
                </div>
                <div className="w-16 text-right">
                  <div className="text-2xl font-bold text-red-600">{Number(a.ratio).toFixed(1)}x</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top spenders */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="font-bold flex items-center justify-between">
          <span>💸 Top spenders (30 kun)</span>
          <span className="text-sm font-normal text-gray-500">
            Jami: <strong>${totalCost.toFixed(2)}</strong>
          </span>
        </h2>
        <div className="mt-4 space-y-1">
          {topSpenders.map((b, i) => (
            <div key={b.bot_id} className="flex items-center gap-3 text-sm border-b py-2 last:border-0">
              <div className="w-8 text-right text-gray-400 font-mono">#{i + 1}</div>
              <div className="flex-1">
                <Link href={`/admin/bots?q=${b.bot_id}`} className="font-semibold hover:underline">
                  {b.bot_name ?? b.bot_id.slice(0, 8)}
                </Link>
                <div className="text-xs text-gray-500">
                  {b.message_count} chaqiruv · {(b.total_tokens / 1000).toFixed(0)}K token
                </div>
              </div>
              <div className="w-32 bg-gray-100 rounded h-2 overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${
                      topSpenders[0] ? (b.total_cost_usd / topSpenders[0].total_cost_usd) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="w-24 text-right font-bold">${b.total_cost_usd.toFixed(3)}</div>
            </div>
          ))}
          {topSpenders.length === 0 && (
            <div className="text-center text-gray-400 py-8">AI usage yozuvi yo'q</div>
          )}
        </div>
      </div>
    </div>
  );
}
