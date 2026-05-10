"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type RevenueData = {
  days: number;
  daily: Array<{
    day: string;
    revenue_uzs: number;
    orders_completed: number;
    orders_total: number;
    orders_cancelled: number;
  }>;
  totals: {
    revenue_uzs: number;
    orders_completed: number;
    orders_cancelled: number;
    orders_total: number;
    aov_uzs: number;
    completion_rate: number;
  };
  top_products: Array<{ name: string; total_qty: number; orders_count: number }>;
  funnel: {
    engaged_users: number;
    buyers: number;
    completed_buyers: number;
    engagement_to_buyer_pct: number;
    buyer_to_completion_pct: number;
  };
  promo: { total_discount_uzs: number; uses_count: number; codes_used: number };
};

export default function RevenuePage() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bots/${id}/revenue?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [id, days]);

  return (
    <div>
      <Topbar title="📊 Daromad va konversiya" back="back" />
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

        {loading || !data ? (
          <div className="text-center py-12 text-muted text-sm">Yuklanmoqda…</div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-2">
              <Kpi
                label="Daromad"
                value={`${(data.totals.revenue_uzs / 1000).toFixed(0)}k so'm`}
                hint={`${data.totals.orders_completed} ta yetkazildi`}
                accent
              />
              <Kpi
                label="O'rtacha buyurtma"
                value={`${(data.totals.aov_uzs / 1000).toFixed(0)}k so'm`}
                hint="AOV"
              />
              <Kpi
                label="Tugatish foizi"
                value={`${data.totals.completion_rate}%`}
                hint={`${data.totals.orders_cancelled} bekor`}
              />
              <Kpi
                label="Promo chegirma"
                value={`-${(data.promo.total_discount_uzs / 1000).toFixed(0)}k`}
                hint={`${data.promo.uses_count} marta`}
              />
            </div>

            {/* Daily revenue chart (sodda barlar) */}
            <div className="panel p-4">
              <div className="text-sm font-semibold mb-2">Kunlik daromad</div>
              <BarChart daily={data.daily} />
            </div>

            {/* Funnel */}
            <div className="panel p-4 space-y-3">
              <div className="text-sm font-semibold">🎯 Konversiya funnel</div>
              <FunnelStep
                emoji="👥"
                label="Bot bilan suhbat"
                value={data.funnel.engaged_users}
                pct={100}
              />
              <FunnelStep
                emoji="🛒"
                label="Buyurtma berdi"
                value={data.funnel.buyers}
                pct={data.funnel.engagement_to_buyer_pct}
                conversion={`${data.funnel.engagement_to_buyer_pct}% suhbatdan buyurtmaga`}
              />
              <FunnelStep
                emoji="✅"
                label="Yetkazildi"
                value={data.funnel.completed_buyers}
                pct={
                  data.funnel.engaged_users > 0
                    ? Math.round(
                        (data.funnel.completed_buyers / data.funnel.engaged_users) * 100,
                      )
                    : 0
                }
                conversion={`${data.funnel.buyer_to_completion_pct}% buyurtma yetkazildi`}
              />
              <div className="text-xs text-muted leading-relaxed pt-2 border-t border-border">
                💡 Engagement→buyer 5-15% yaxshi. Yomon bo&apos;lsa: AI prompt'ni
                yaxshilang yoki Mini App'da mahsulotlarni boyiting.
              </div>
            </div>

            {/* Top products */}
            <div className="panel p-4">
              <div className="text-sm font-semibold mb-2">🏆 Top 5 mahsulot</div>
              {data.top_products.length === 0 ? (
                <div className="text-xs text-muted py-4 text-center">
                  Hali yetkazilgan buyurtma yo&apos;q
                </div>
              ) : (
                <div className="space-y-2">
                  {data.top_products.map((p, i) => {
                    const max = data.top_products[0]?.total_qty ?? 1;
                    const pct = (p.total_qty / max) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="font-medium truncate flex-1 mr-2">
                            #{i + 1}. {p.name}
                          </span>
                          <span className="text-xs text-muted whitespace-nowrap">
                            {p.total_qty} dona ({p.orders_count} buyurtma)
                          </span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`panel p-3 ${accent ? "border-accent/40" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-xl font-extrabold mt-0.5 ${accent ? "text-accent" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function FunnelStep({
  emoji,
  label,
  value,
  pct,
  conversion,
}: {
  emoji: string;
  label: string;
  value: number;
  pct: number;
  conversion?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm flex items-center gap-2">
          <span>{emoji}</span>
          <span>{label}</span>
        </div>
        <div className="font-bold">{value}</div>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      {conversion && (
        <div className="text-[10px] text-muted mt-0.5">{conversion}</div>
      )}
    </div>
  );
}

function BarChart({
  daily,
}: {
  daily: Array<{ day: string; revenue_uzs: number }>;
}) {
  if (daily.length === 0) {
    return <div className="text-xs text-muted text-center py-4">Ma&apos;lumot yo&apos;q</div>;
  }
  const max = Math.max(...daily.map((d) => d.revenue_uzs), 1);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-0.5 h-32">
        {daily.map((d, i) => {
          const h = (d.revenue_uzs / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex items-end"
              title={`${d.day}: ${d.revenue_uzs.toLocaleString("uz-UZ")} so'm`}
            >
              <div
                className="w-full bg-gradient-to-t from-accent to-accent2 rounded-t"
                style={{ height: `${Math.max(h, 2)}%`, minHeight: "2px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{daily[0]?.day.slice(5)}</span>
        <span>{daily[daily.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}
