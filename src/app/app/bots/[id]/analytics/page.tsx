"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Topbar from "@/components/Topbar";

const AnalyticsChart = dynamic(() => import("@/components/AnalyticsChart"), { ssr: false });

type Row = {
  day: string;
  conversations: number;
  leads: number;
  messages: number;
  cost_usd: number;
};

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bots/${id}/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d.daily ?? []))
      .finally(() => setLoading(false));
  }, [id, days]);

  const totals = data.reduce(
    (acc, r) => ({
      conv: acc.conv + r.conversations,
      lead: acc.lead + r.leads,
      msg: acc.msg + r.messages,
      cost: acc.cost + Number(r.cost_usd ?? 0),
    }),
    { conv: 0, lead: 0, msg: 0, cost: 0 }
  );

  const conversion = totals.conv > 0 ? ((totals.lead / totals.conv) * 100).toFixed(1) : "0";

  return (
    <div>
      <Topbar title="Analytics" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-xs border ${
                days === d
                  ? "bg-accent text-white border-accent"
                  : "bg-panel border-border text-muted"
              }`}
            >
              {d} kun
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Jami suhbat" value={totals.conv} />
          <Stat label="Jami lead" value={totals.lead} />
          <Stat label="Konversiya" value={`${conversion}%`} />
          <Stat label="AI xarajat" value={`$${totals.cost.toFixed(3)}`} />
        </div>

        <div className="panel p-3">
          {loading ? (
            <div className="text-center text-muted text-sm py-8">Yuklanmoqda…</div>
          ) : (
            <AnalyticsChart data={data} />
          )}
        </div>

        <div className="panel p-4 text-xs text-muted leading-relaxed">
          <div className="font-semibold text-text mb-1">📊 Konversiya nima?</div>
          Mijozning siz bilan suhbat boshlagan va lead (telefon, ariza) qoldirgan ulushi.
          Salon uchun 8–15% yaxshi. 5% dan past bo‘lsa AI prompt yoki bilim bazasini yaxshilang.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}
