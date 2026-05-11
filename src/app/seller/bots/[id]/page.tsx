"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { sellerFetch, tgWebApp } from "../../_lib";

type Bot = {
  id: string;
  name: string;
  business_name: string | null;
  tg_username: string | null;
  status: string;
  icon: string | null;
  vertical: string | null;
  orders_30d: number;
  revenue_30d: number;
};

export default function SellerBotDashboard() {
  const { id } = useParams<{ id: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    sellerFetch("/api/seller/bots")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setErr(d.error);
          return;
        }
        const found = (d.bots ?? []).find((b: Bot) => b.id === id) ?? null;
        if (!found) setErr("Bot topilmadi yoki ruxsat yo'q");
        else setBot(found);
      });

    // Telegram BackButton'ni faollashtirish
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
  }, [id]);

  if (err) {
    return (
      <div style={{ padding: 24, color: "#B00020", textAlign: "center" }}>
        ⚠️ {err}
      </div>
    );
  }

  if (!bot) {
    return (
      <div style={{ padding: 24, color: "#6B6B7B", textAlign: "center" }}>
        Yuklanmoqda…
      </div>
    );
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
      {/* Header card */}
      <div style={{ padding: "16px" }}>
        <div
          style={{
            padding: 18,
            background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
            color: "#fff",
            borderRadius: 18,
            boxShadow: "0 8px 20px rgba(236,72,153,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 36 }}>{bot.icon ?? "🤖"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {bot.business_name ?? bot.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {bot.tg_username ? `@${bot.tg_username}` : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Stat label="30 kun" value={`${(bot.revenue_30d / 1000).toFixed(0)}k`} />
            <Stat label="Buyurtma" value={String(bot.orders_30d)} />
            <Stat
              label="Status"
              value={bot.status === "active" ? "Aktiv" : "Pauza"}
            />
          </div>
        </div>
      </div>

      {/* Nav grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          padding: "0 16px",
        }}
      >
        <NavCard
          href={`/seller/bots/${id}/services`}
          icon="📋"
          title="Mahsulotlar"
          subtitle="Qo'shish, narx, rasm"
        />
        <NavCard
          href={`/seller/bots/${id}/orders`}
          icon="🛒"
          title="Buyurtmalar"
          subtitle="Status o'zgartirish"
          highlight
        />
        <NavCard
          href={`/seller/bots/${id}/promo`}
          icon="🎟"
          title="Promo kodlar"
          subtitle="Aksiya yaratish"
        />
        <NavCard
          href={`/seller/bots/${id}/revenue`}
          icon="💰"
          title="Daromad"
          subtitle="Analitika"
        />
      </div>

      {/* Tezkor link'lar */}
      {bot.tg_username && (
        <div style={{ padding: 16 }}>
          <div
            style={{
              padding: 12,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 14,
              fontSize: 13,
            }}
          >
            <div style={{ color: "#6B6B7B", marginBottom: 6 }}>
              Mijoz Mini App'i:
            </div>
            <a
              href={`/c/${bot.tg_username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#EC4899", fontWeight: 600 }}
            >
              botforge-beige.vercel.app/c/{bot.tg_username} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{value}</div>
      <div
        style={{
          fontSize: 10,
          opacity: 0.8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  subtitle,
  highlight,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 14,
        background: "#fff",
        border: `1px solid ${highlight ? "#FFB7C5" : "rgba(0,0,0,0.06)"}`,
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        textDecoration: "none",
        color: "#1A1B2E",
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#9B9BAB", marginTop: 2 }}>
        {subtitle}
      </div>
    </Link>
  );
}
