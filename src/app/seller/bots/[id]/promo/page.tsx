"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { sellerFetch, tgWebApp } from "../../../_lib";

type Promo = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  used_count: number;
  max_uses: number | null;
  is_active: boolean;
  valid_until: string | null;
  description: string | null;
};

export default function SellerPromoPage() {
  const { id } = useParams<{ id: string }>();
  const [codes, setCodes] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load();
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

  async function load() {
    const r = await sellerFetch(`/api/seller/bots/${id}/promo`);
    const d = await r.json();
    setCodes(d.codes ?? []);
  }

  async function create() {
    setErr(null);
    const dv = parseInt(value, 10);
    if (!code || !dv) {
      setErr("Kod va qiymatni kiriting");
      return;
    }
    setBusy(true);
    try {
      const r = await sellerFetch(`/api/seller/bots/${id}/promo`, {
        method: "POST",
        body: JSON.stringify({
          code,
          discount_type: type,
          discount_value: dv,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error);
        return;
      }
      setCode("");
      setValue("10");
      const tg = tgWebApp();
      tg?.HapticFeedback?.notificationOccurred?.("success");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(codeId: string) {
    if (!confirm("O'chirishni tasdiqlang")) return;
    await sellerFetch(`/api/seller/bots/${id}/promo?codeId=${codeId}`, {
      method: "DELETE",
    });
    await load();
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setCode(s);
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
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎟 Promo kodlar</h1>
      </header>

      {/* Create form */}
      <div
        style={{
          margin: "0 16px 16px",
          padding: 14,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TUG10"
            style={{
              flex: 1,
              border: "1px solid #F0F0F4",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              fontFamily: "ui-monospace, monospace",
              textTransform: "uppercase",
              outline: "none",
            }}
          />
          <button
            onClick={generateCode}
            style={{
              padding: "10px 14px",
              border: "1px solid #F0F0F4",
              borderRadius: 10,
              background: "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            🎲
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <button
            onClick={() => setType("percent")}
            style={{
              padding: 10,
              borderRadius: 10,
              border: `1.5px solid ${type === "percent" ? "#EC4899" : "#F0F0F4"}`,
              background: type === "percent" ? "#FFF0F5" : "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            % Foiz
          </button>
          <button
            onClick={() => setType("fixed")}
            style={{
              padding: 10,
              borderRadius: 10,
              border: `1.5px solid ${type === "fixed" ? "#EC4899" : "#F0F0F4"}`,
              background: type === "fixed" ? "#FFF0F5" : "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            so&apos;m
          </button>
        </div>

        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === "percent" ? "10" : "20000"}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #F0F0F4",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            marginBottom: 10,
            outline: "none",
          }}
        />

        {err && (
          <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>
            {err}
          </div>
        )}

        <button
          onClick={create}
          disabled={busy || !code || !value}
          style={{
            width: "100%",
            padding: 12,
            background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            opacity: busy || !code || !value ? 0.5 : 1,
          }}
        >
          {busy ? "Yaratilmoqda..." : "🎟 Yaratish"}
        </button>
      </div>

      {/* Existing codes */}
      <div style={{ padding: "0 16px" }}>
        {codes.map((c) => (
          <div
            key={c.id}
            style={{
              marginBottom: 8,
              padding: 12,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "#EC4899" }}>
                {c.code}
              </div>
              <div style={{ fontSize: 11, color: "#9B9BAB" }}>
                {c.discount_type === "percent"
                  ? `${c.discount_value}%`
                  : `${c.discount_value.toLocaleString()} so'm`}
                {" · "}
                {c.used_count}/{c.max_uses ?? "∞"} ishlatildi
              </div>
            </div>
            <button
              onClick={() => remove(c.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "#EF4444",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
