"use client";

// Bot Doctor — bot egasi haftalik tahlilni ko'radi va takliflarni qabul qilishi mumkin.

import { useEffect, useState } from "react";

type Suggestion = {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  before?: string;
  after?: string;
  rationale: string;
};

type Diagnostic = {
  id: string;
  period_start: string;
  period_end: string;
  total_conversations: number;
  total_messages: number;
  total_leads: number;
  total_bookings: number;
  total_orders: number;
  insights: { top_questions?: string[]; missing_info?: string[]; conversion_pct?: number; satisfaction_estimate?: string };
  suggestions: Suggestion[];
  reviewed: boolean;
  applied_count: number;
  created_at: string;
};

const sevColor: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-blue-100 text-blue-700 border-blue-300",
};

export default function DiagnosticsPage({ params }: { params: { id: string } }) {
  const [list, setList] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    const res = await fetch(`/api/bots/${params.id}/diagnostics`);
    const data = await res.json();
    setList(data.diagnostics ?? []);
    setLoading(false);
  }

  async function runNow() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/bots/${params.id}/diagnostics`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message ?? "Xato");
      } else {
        await load();
      }
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🩺 Bot Doctor</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI haftalik suhbatlarni tahlil qilib, prompt yaxshilash takliflari beradi.
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
        >
          {running ? "Tahlil qilyapti..." : "🔬 Hozir tahlil qil"}
        </button>
      </div>

      {list.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
          <p>Hali tahlil yo'q.</p>
          <p className="text-sm mt-1">"Hozir tahlil qil" tugmasini bosing yoki haftaga kuting (avtomatik dushanba ertalab).</p>
        </div>
      )}

      {list.map((d) => (
        <div key={d.id} className="border rounded-lg p-4 bg-white space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-500">
                {new Date(d.period_start).toLocaleDateString("uz")} —{" "}
                {new Date(d.period_end).toLocaleDateString("uz")}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(d.created_at).toLocaleString("uz")}
              </div>
            </div>
            {d.reviewed && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                ✓ Ko'rib chiqildi
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
            <Stat label="Suhbatlar" value={d.total_conversations} />
            <Stat label="Xabarlar" value={d.total_messages} />
            <Stat label="Lead'lar" value={d.total_leads} />
            <Stat label="Bron" value={d.total_bookings} />
            <Stat label="Buyurtma" value={d.total_orders} />
          </div>

          {d.insights?.top_questions && d.insights.top_questions.length > 0 && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">
                Eng ko'p so'ralgan savollar
              </div>
              <ul className="text-sm space-y-1">
                {d.insights.top_questions.map((q, i) => (
                  <li key={i}>• {q}</li>
                ))}
              </ul>
            </div>
          )}

          {d.suggestions && d.suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Takliflar ({d.suggestions.length})</div>
              {d.suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`border rounded p-3 ${sevColor[s.severity] ?? sevColor.low}`}
                >
                  <div className="font-semibold text-sm">
                    [{s.severity.toUpperCase()}] {s.title}
                  </div>
                  <div className="text-xs mt-1 opacity-80">{s.rationale}</div>
                  {s.before && (
                    <div className="mt-2 text-xs">
                      <span className="font-semibold">Hozir:</span> {s.before}
                    </div>
                  )}
                  {s.after && (
                    <div className="mt-1 text-xs">
                      <span className="font-semibold">Tavsiya:</span> {s.after}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
