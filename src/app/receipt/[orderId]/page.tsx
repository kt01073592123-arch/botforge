// Mijoz uchun chiroyli PDF-friendly chek sahifa.
// Mijoz Mini App'dan ushbu URL'ni oladi va telefonida "Print → PDF" qiladi.
// Auth shart emas — order_id orqali ochiq.

import { notFound } from "next/navigation";
import { db } from "@/lib/supabase/server";
import ReceiptActions from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { name: string; price: string; qty: number };

const STATUS_LABEL: Record<string, string> = {
  pending: "Kutilmoqda",
  confirmed: "Qabul qilindi",
  in_progress: "Yo'lda",
  completed: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const sb = db();
  const { data: order } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return notFound();

  const o = order as {
    id: string;
    bot_id: string;
    customer_name: string | null;
    customer_phone: string | null;
    items: unknown;
    total_uzs: number;
    note: string | null;
    status: string;
    created_at: string;
    completed_at: string | null;
  };

  const { data: botRow } = await sb
    .from("bots")
    .select("business_name, tg_username")
    .eq("id", o.bot_id)
    .maybeSingle();
  const businessName = (botRow as { business_name: string | null } | null)?.business_name ?? "Bot";
  const botUsername = (botRow as { tg_username: string | null } | null)?.tg_username ?? "";

  let items: Item[] = [];
  if (typeof o.items === "string") {
    try { items = JSON.parse(o.items) as Item[]; } catch {}
  } else if (Array.isArray(o.items)) {
    items = o.items as Item[];
  }

  const displayId = `ORD-${o.id.slice(-6).toUpperCase()}`;
  const date = new Date(o.created_at);

  const status = o.status;
  const statusBg =
    status === "completed" ? "#E6F9F1" :
    status === "cancelled" ? "#FFE6E6" : "#FFF7E0";
  const statusColor =
    status === "completed" ? "#10B981" :
    status === "cancelled" ? "#EF4444" : "#F59E0B";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F5F7",
        padding: "24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        color: "#1A1B2E",
      }}
    >
      <style>{`
        @media print {
          body, html { background: #fff !important; }
          .receipt-actions { display: none !important; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
            color: "#fff",
            padding: "28px 24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>
            {businessName}
          </h1>
          <div style={{ fontSize: 12, opacity: 0.9, letterSpacing: 1, fontFamily: "ui-monospace, monospace" }}>
            {displayId}
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <Row label="Sana" value={date.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })} />
          <Row
            label="Holat"
            value={
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: statusBg,
                  color: statusColor,
                }}
              >
                {STATUS_LABEL[status] ?? status}
              </span>
            }
          />
          {o.customer_name && <Row label="Mijoz" value={o.customer_name} />}
          {o.customer_phone && <Row label="Telefon" value={o.customer_phone} />}
          {o.note && <Row label="Izoh" value={o.note} />}

          <div
            style={{
              margin: "16px 0",
              padding: 16,
              background: "#FAFAFC",
              borderRadius: 12,
            }}
          >
            {items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontSize: 13,
                  gap: 8,
                  borderTop: i > 0 ? "1px solid #F0F0F4" : "none",
                }}
              >
                <span style={{ flex: 1 }}>
                  {it.name}
                  <span style={{ color: "#6B6B7B", marginLeft: 8 }}>× {it.qty}</span>
                </span>
                <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{it.price}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "linear-gradient(135deg, #FFF0F5, #FFE4EC)",
              borderRadius: 12,
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 12, color: "#6B6B7B", textTransform: "uppercase", letterSpacing: 1 }}>
              Jami
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#EC4899" }}>
              {o.total_uzs.toLocaleString("uz-UZ")} so&apos;m
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "20px 24px",
            textAlign: "center",
            fontSize: 11,
            color: "#9B9BAB",
            borderTop: "1px solid #F0F0F4",
          }}
        >
          Powered by BotForge {botUsername ? `· @${botUsername}` : ""}
        </div>
      </div>
      <ReceiptActions botUsername={botUsername} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        fontSize: 14,
        gap: 12,
        borderTop: "1px solid #F0F0F4",
      }}
    >
      <span style={{ color: "#6B6B7B" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;
  return {
    title: `Chek ORD-${orderId.slice(-6).toUpperCase()}`,
    robots: "noindex",
  };
}
