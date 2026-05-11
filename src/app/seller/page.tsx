"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getInitData, sellerFetch } from "./_lib";

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

export default function SellerHome() {
  const [bots, setBots] = useState<Bot[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<{ first_name?: string } | null>(null);

  useEffect(() => {
    if (!getInitData()) {
      setErr(
        "Bu sahifa Telegram orqali ochilishi kerak. @BotForgeBot ga /start yuborib, 'Botlarimni boshqarish' tugmasini bosing.",
      );
      return;
    }
    sellerFetch("/api/seller/bots")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setErr(d.error);
        } else {
          setBots(d.bots ?? []);
          setUser(d.user ?? null);
        }
      })
      .catch((e) => setErr((e as Error).message));
  }, []);

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
      <header style={{ padding: "20px 16px 12px" }}>
        <div style={{ fontSize: 12, color: "#6B6B7B" }}>
          Salom{user?.first_name ? `, ${user.first_name}` : ""} 👋
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0" }}>
          🛠 Botlarimni boshqarish
        </h1>
      </header>

      {err && (
        <div
          style={{
            margin: "0 16px",
            padding: 14,
            borderRadius: 12,
            background: "#FFF3F3",
            border: "1px solid #FFDADA",
            color: "#B00020",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          ⚠️ {err}
        </div>
      )}

      {!bots && !err && (
        <div style={{ padding: "0 16px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 96,
                background: "#FAFAFC",
                border: "1px solid #F0F0F4",
                borderRadius: 16,
                marginBottom: 10,
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
        </div>
      )}

      {bots && bots.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#6B6B7B" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>🤖</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Hali bot yo&apos;q
          </div>
          <div style={{ fontSize: 13 }}>
            Brauzerda{" "}
            <a
              href="https://botforge-beige.vercel.app"
              style={{ color: "#EC4899" }}
            >
              botforge-beige.vercel.app
            </a>
            ga kirib bot yarating
          </div>
        </div>
      )}

      {bots && bots.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          {bots.map((b) => (
            <Link
              key={b.id}
              href={`/seller/bots/${b.id}`}
              style={{
                display: "block",
                marginBottom: 10,
                padding: 14,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                textDecoration: "none",
                color: "#1A1B2E",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {b.icon ?? "🤖"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}
                  >
                    {b.business_name ?? b.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#9B9BAB" }}>
                    {b.tg_username ? `@${b.tg_username}` : "Token ulanmagan"}{" "}
                    · {b.status === "active" ? "✅ Aktiv" : "⏸ Pauza"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#EC4899",
                    }}
                  >
                    {b.revenue_30d > 0
                      ? `${(b.revenue_30d / 1000).toFixed(0)}k`
                      : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#9B9BAB" }}>
                    {b.orders_30d} buyurtma / 30 kun
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
