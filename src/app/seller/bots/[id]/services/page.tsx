"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { sellerFetch, getInitData, tgWebApp } from "../../../_lib";

type Service = {
  name: string;
  price: string;
  duration?: string;
  description?: string;
  photo_url?: string;
  in_stock?: boolean;
};

export default function SellerServicesPage() {
  const { id } = useParams<{ id: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    sellerFetch(`/api/seller/bots/${id}/services`)
      .then((r) => r.json())
      .then((d) => {
        setServices((d.services ?? []) as Service[]);
        setLoading(false);
      });

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

  // Telegram MainButton — Saqlash
  useEffect(() => {
    const tg = tgWebApp();
    if (!tg?.MainButton) return;
    tg.MainButton.setText(saved ? "✓ Saqlandi" : busy ? "Saqlanmoqda..." : "💾 Saqlash");
    tg.MainButton.show();
    if (busy) tg.MainButton.disable();
    else tg.MainButton.enable();
    const handler = () => save();
    tg.MainButton.onClick(handler);
    return () => {
      tg.MainButton.offClick(handler);
      tg.MainButton.hide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, busy, saved]);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const r = await sellerFetch(`/api/seller/bots/${id}/services`, {
        method: "PUT",
        body: JSON.stringify({ services }),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        const tg = tgWebApp();
        tg?.HapticFeedback?.notificationOccurred?.("success");
      }
    } finally {
      setBusy(false);
    }
  }

  function addNew() {
    setServices((s) => [...s, { name: "", price: "", in_stock: true }]);
    setExpanded(services.length);
  }

  function update(i: number, patch: Partial<Service>) {
    setServices((s) => s.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  function remove(i: number) {
    setServices((s) => s.filter((_, j) => j !== i));
    if (expanded === i) setExpanded(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFC 100%)",
        color: "#1A1B2E",
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: 100,
      }}
    >
      <header style={{ padding: "16px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          📋 Mahsulotlar
        </h1>
        <div style={{ fontSize: 12, color: "#6B6B7B", marginTop: 4 }}>
          Jami: {services.length} ta
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9B9BAB" }}>
          Yuklanmoqda…
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          {services.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "#9B9BAB",
                background: "#fff",
                border: "1px dashed rgba(0,0,0,0.1)",
                borderRadius: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 36, opacity: 0.5, marginBottom: 8 }}>
                📦
              </div>
              Hali mahsulot yo&apos;q. Pastdagi tugmani bosing.
            </div>
          )}

          {services.map((s, i) => (
            <ServiceCard
              key={i}
              service={s}
              botId={id}
              expanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
              onChange={(patch) => update(i, patch)}
              onRemove={() => remove(i)}
            />
          ))}

          <button
            onClick={addNew}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: 8,
              background: "#fff",
              border: "1px dashed #EC4899",
              borderRadius: 14,
              fontWeight: 700,
              color: "#EC4899",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Yangi mahsulot
          </button>

          <BulkImport
            onImport={(arr) => {
              setServices((s) => [...s, ...arr]);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  botId,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  service: Service;
  botId: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Service>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        marginBottom: 10,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {service.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.photo_url}
            alt=""
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "#FAFAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            📦
          </div>
        )}
        <input
          value={service.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Mahsulot nomi"
          style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #F0F0F4",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <input
          value={service.price}
          onChange={(e) => onChange({ price: e.target.value })}
          placeholder="Narx"
          style={{
            width: 80,
            border: "1px solid #F0F0F4",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={onToggle}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 18,
            color: "#9B9BAB",
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          {expanded ? "▴" : "▾"}
        </button>
      </div>

      {expanded && (
        <div
          style={{
            padding: 14,
            borderTop: "1px solid #F0F0F4",
            background: "#FAFAFC",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "#6B6B7B",
                marginBottom: 4,
              }}
            >
              Rasm
            </label>
            <PhotoPicker
              botId={botId}
              value={service.photo_url}
              productName={service.name}
              productDescription={service.description}
              onChange={(url) => onChange({ photo_url: url })}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "#6B6B7B",
                marginBottom: 4,
              }}
            >
              Tavsif (AI ishlatish uchun)
            </label>
            <textarea
              value={service.description ?? ""}
              onChange={(e) =>
                onChange({ description: e.target.value || undefined })
              }
              rows={3}
              placeholder="Masalan: 30ml shisha, Korea brendi"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #F0F0F4",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            <input
              type="checkbox"
              checked={service.in_stock !== false}
              onChange={(e) => onChange({ in_stock: e.target.checked })}
            />
            Sotuvda bor
          </label>

          <button
            onClick={onRemove}
            style={{
              border: "none",
              background: "transparent",
              color: "#EF4444",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🗑 O&apos;chirish
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoPicker({
  botId,
  value,
  productName,
  productDescription,
  onChange,
}: {
  botId: string;
  value: string | undefined;
  productName: string;
  productDescription?: string;
  onChange: (url: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`/api/seller/bots/${botId}/upload`, {
      method: "POST",
      headers: { "X-Init-Data": getInitData() },
      body: fd,
    });
    const d = await r.json();
    if (r.ok) onChange(d.url);
    setBusy(false);
  }

  async function handleAi() {
    if (!productName.trim()) {
      alert("Avval mahsulot nomini kiriting");
      return;
    }
    setAiBusy(true);
    const r = await sellerFetch(`/api/seller/bots/${botId}/generate-image`, {
      method: "POST",
      body: JSON.stringify({
        productName,
        description: productDescription,
      }),
    });
    const d = await r.json();
    if (r.ok) onChange(d.url);
    setAiBusy(false);
  }

  return (
    <div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          style={{
            width: "100%",
            maxHeight: 200,
            objectFit: "cover",
            borderRadius: 10,
            marginBottom: 8,
          }}
        />
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #F0F0F4",
            borderRadius: 10,
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {busy ? "Yuklanmoqda…" : "📷 Rasm"}
        </button>
        <button
          type="button"
          onClick={handleAi}
          disabled={aiBusy}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #F0F0F4",
            borderRadius: 10,
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {aiBusy ? "Yaratilmoqda…" : "🤖 AI"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            style={{
              padding: "10px 12px",
              border: "1px solid #FFDADA",
              borderRadius: 10,
              background: "#fff",
              color: "#EF4444",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function BulkImport({ onImport }: { onImport: (arr: Service[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function apply() {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const arr: Service[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0];
      if (!name) continue;
      arr.push({
        name,
        price: parts[1] ?? "",
        description: parts.slice(2).join(", ").trim() || undefined,
        in_stock: true,
      });
    }
    if (arr.length > 0) {
      onImport(arr);
      setText("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: 8,
          background: "transparent",
          border: "none",
          color: "#6B6B7B",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        📋 Bulk import (10+ mahsulot)
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 14,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
        📋 Bulk import
      </div>
      <div style={{ fontSize: 11, color: "#9B9BAB", marginBottom: 8 }}>
        Har qator: <code>nom, narx, tavsif</code>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={`Niacinamide serum, 120000 so'm, 30ml
SPF krem, 150000 so'm, 50ml`}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #F0F0F4",
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          fontFamily: "ui-monospace, monospace",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button
          type="button"
          onClick={apply}
          disabled={!text.trim()}
          style={{
            flex: 1,
            padding: "10px",
            background: "#EC4899",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Qo&apos;shish
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: "10px 16px",
            background: "#fff",
            color: "#6B6B7B",
            border: "1px solid #F0F0F4",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Bekor
        </button>
      </div>
    </div>
  );
}
