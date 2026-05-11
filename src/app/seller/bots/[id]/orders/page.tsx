"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { sellerFetch, tgWebApp } from "../../../_lib";

type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_tg_username: string | null;
  items: Array<{ name: string; price: string; qty: number }>;
  total_uzs: number;
  status: string;
  note: string | null;
  created_at: string;
};

const STATUS_FLOW: Record<
  string,
  { label: string; color: string; emoji: string; next: { to: string; label: string }[] }
> = {
  pending: {
    label: "Yangi", color: "#F59E0B", emoji: "🆕",
    next: [
      { to: "confirmed", label: "✓ Qabul qildim" },
      { to: "cancelled", label: "Bekor" },
    ],
  },
  confirmed: {
    label: "Qabul qilindi", color: "#10B981", emoji: "✅",
    next: [
      { to: "in_progress", label: "🚚 Jo'natildi" },
      { to: "completed", label: "📦 Yetkazildi" },
      { to: "cancelled", label: "Bekor" },
    ],
  },
  in_progress: {
    label: "Yo'lda", color: "#3B82F6", emoji: "🚚",
    next: [{ to: "completed", label: "📦 Yetkazildi" }],
  },
  completed: { label: "Yetkazildi", color: "#8B5CF6", emoji: "📦", next: [] },
  cancelled: { label: "Bekor qilindi", color: "#EF4444", emoji: "❌", next: [] },
};

export default function SellerOrdersPage() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    const tg = tgWebApp();
    if (tg?.BackButton) {
      tg.BackButton.show();
      const handler = () => history.back();
      tg.BackButton.onClick(handler);
      return () => {
        clearInterval(t);
        tg.BackButton.offClick(handler);
        tg.BackButton.hide();
      };
    }
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filter]);

  async function load() {
    const params = new URLSearchParams();
    if (filter === "active") {
      ["pending", "confirmed", "in_progress"].forEach((s) => params.append("status", s));
    }
    const r = await sellerFetch(`/api/seller/bots/${id}/orders?${params}`);
    const d = await r.json();
    setOrders(d.orders ?? []);
    setLoading(false);
  }

  async function changeStatus(orderId: string, status: string) {
    setBusy(orderId);
    try {
      await sellerFetch(
        `/api/seller/bots/${id}/orders?orderId=${orderId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      const tg = tgWebApp();
      tg?.HapticFeedback?.notificationOccurred?.("success");
      await load();
    } finally {
      setBusy(null);
    }
  }

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
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🛒 Buyurtmalar</h1>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                background:
                  filter === f
                    ? "linear-gradient(135deg, #EC4899, #8B5CF6)"
                    : "#fff",
                color: filter === f ? "#fff" : "#6B6B7B",
                boxShadow: filter === f ? "0 2px 8px rgba(236,72,153,0.3)" : "none",
                cursor: "pointer",
              }}
            >
              {f === "active" ? "Faol" : "Hammasi"}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#9B9BAB", alignSelf: "center" }}>
            Avto: 20s
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9B9BAB" }}>
          Yuklanmoqda…
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#9B9BAB" }}>
          <div style={{ fontSize: 36, opacity: 0.5, marginBottom: 8 }}>🛒</div>
          Buyurtma yo&apos;q
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          {orders.map((o) => {
            const st = STATUS_FLOW[o.status] ?? STATUS_FLOW.pending;
            const displayId = `ORD-${o.id.slice(-6).toUpperCase()}`;
            const date = new Date(o.created_at);
            return (
              <div
                key={o.id}
                style={{
                  marginBottom: 10,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {o.customer_name ?? "Mijoz"}
                    </div>
                    <div style={{ fontSize: 10, color: "#9B9BAB" }}>
                      {displayId} · {date.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </div>
                    {o.customer_phone && (
                      <a
                        href={`tel:${o.customer_phone}`}
                        style={{ fontSize: 12, color: "#EC4899", textDecoration: "none" }}
                      >
                        📞 {o.customer_phone}
                      </a>
                    )}
                  </div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${st.color}20`,
                      color: st.color,
                    }}
                  >
                    {st.emoji} {st.label}
                  </span>
                </div>

                <div
                  style={{
                    background: "#FAFAFC",
                    borderRadius: 10,
                    padding: 8,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {o.items.slice(0, 4).map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>
                        {it.name} × {it.qty}
                      </span>
                      <span style={{ fontWeight: 600 }}>{it.price}</span>
                    </div>
                  ))}
                  {o.items.length > 4 && (
                    <div style={{ fontSize: 10, color: "#9B9BAB" }}>
                      ... va yana {o.items.length - 4}
                    </div>
                  )}
                  {o.note && (
                    <div style={{ fontStyle: "italic", marginTop: 4 }}>📝 {o.note}</div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#EC4899",
                    marginBottom: st.next.length > 0 ? 10 : 0,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#6B6B7B", fontWeight: 600 }}>
                    JAMI
                  </span>
                  <span>{o.total_uzs.toLocaleString("uz-UZ")} so&apos;m</span>
                </div>

                {st.next.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {st.next.map((n) => (
                      <button
                        key={n.to}
                        disabled={busy === o.id}
                        onClick={() => changeStatus(o.id, n.to)}
                        style={{
                          flex: n.to !== "cancelled" ? 1 : "0 0 auto",
                          padding: "8px 14px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          fontWeight: 700,
                          background:
                            n.to === "cancelled"
                              ? "#fff"
                              : "linear-gradient(135deg, #EC4899, #8B5CF6)",
                          color: n.to === "cancelled" ? "#EF4444" : "#fff",
                          borderColor: "#F0F0F4",
                          borderWidth: n.to === "cancelled" ? 1 : 0,
                          borderStyle: "solid",
                          cursor: "pointer",
                          opacity: busy === o.id ? 0.5 : 1,
                        }}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
