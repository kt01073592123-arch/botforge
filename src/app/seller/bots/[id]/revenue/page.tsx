"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { sellerFetch, tgWebApp } from "../../../_lib";

type Data = {
  totals: {
    revenue_uzs: number;
    orders_completed: number;
    orders_cancelled: number;
    orders_total: number;
    aov_uzs: number;
  };
  top_products: Array<{ name: string; total_qty: number; orders_count: number }>;
};

export default function SellerRevenuePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    sellerFetch(`/api/seller/bots/${id}/revenue?days=${days}`)
      .then((r) => r.json())
      .then(setData);

    const tg = tgWebApp();
    if (tg?.BackButton) {
      tg.BackButton.show();
      const handler = () => history.back();
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
        tg.BackButton.hide();
      };
    }
    return undefined;
  }, [id, days]);

  const t = data?.totals;
  const completionRate =
    t && t.orders_total > 0
      ? Math.round((t.orders_completed / t.orders_total) * 100)
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFC 100%)",
        color: "#1A1B2E",
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: 32,
      }}
    >
      <header style={{ padding: "16px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>💰 Daromad</h1>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                background: days === d ? "linear-gradient(135deg, #EC4899, #8B5CF6)" : "#fff",
                color: days === d ? "#fff" : "#6B6B7B",
                cursor: "pointer",
              }}
            >
              {d} kun
            </button>
          ))}
        </div>
      </header>

      {!data ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9B9BAB" }}>Yuklanmoqda…</div>
      ) : (
        <>
          {/* Big revenue card */}
          <div style={{ padding: "0 16px 12px" }}>
            <div
              style={{
                padding: 20,
                background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
                color: "#fff",
                borderRadius: 18,
                textAlign: "center",
                boxShadow: "0 8px 20px rgba(236,72,153,0.25)",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>
                Daromad
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>
                {(t!.revenue_uzs / 1000).toFixed(0)}k so&apos;m
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                {t!.orders_completed} buyurtma · O&apos;rtacha{" "}
                {(t!.aov_uzs / 1000).toFixed(0)}k
              </div>
            </div>
          </div>

          {/* Mini KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 16px 16px" }}>
            <Mini label="Tugatildi" value={`${completionRate}%`} />
            <Mini label="Faol" value={`${t!.orders_total - t!.orders_completed - t!.orders_cancelled}`} />
            <Mini label="Bekor" value={String(t!.orders_cancelled)} />
          </div>

          {/* Top products */}
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              🏆 Top mahsulot
            </div>
            {data.top_products.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9B9BAB", fontSize: 13, background: "#fff", borderRadius: 12 }}>
                Hali yetkazilgan buyurtma yo&apos;q
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
                {data.top_products.map((p, i) => {
                  const max = data.top_products[0].total_qty || 1;
                  const pct = (p.total_qty / max) * 100;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        borderTop: i > 0 ? "1px solid #F0F0F4" : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>
                          #{i + 1} {p.name}
                        </span>
                        <span style={{ color: "#9B9BAB", fontSize: 11 }}>
                          {p.total_qty} dona
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#F0F0F4", borderRadius: 2, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, #EC4899, #8B5CF6)",
                          }}
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
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18, color: "#1A1B2E" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#9B9BAB", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  );
}
