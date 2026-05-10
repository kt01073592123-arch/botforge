"use client";

import { useRef, useState } from "react";

export default function PhotoInput({
  botId,
  value,
  onChange,
  productName,
  productDescription,
}: {
  botId: string;
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  // Mahsulot uchun AI rasm yaratish — bo'lsa "AI rasm" tugmasi chiqadi.
  productName?: string;
  productDescription?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/bots/${botId}/upload`, {
        method: "POST",
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onChange(d.url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAiGenerate() {
    if (!productName || productName.trim().length < 2) {
      setErr("Avval mahsulot nomini kiriting");
      return;
    }
    setAiBusy(true);
    setErr(null);
    setAiInfo(null);
    try {
      const res = await fetch(`/api/bots/${botId}/services/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          description: productDescription,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onChange(d.url);
      const providerLabel: Record<string, string> = {
        unsplash: "Unsplash (real photo)",
        replicate: "AI generatsiya",
        picsum: "Placeholder (fallback)",
      };
      setAiInfo(`✓ ${providerLabel[d.provider] ?? d.provider}`);
      setTimeout(() => setAiInfo(null), 4000);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div>
      {value ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="w-20 h-20 rounded-lg object-cover bg-border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="flex-1 space-y-1">
            <input
              className="input !text-xs font-mono"
              value={value}
              onChange={(e) => onChange(e.target.value || undefined)}
              placeholder="https://..."
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="btn-ghost !py-1 !px-2 !text-[11px]"
              >
                {busy ? "Yuklanmoqda…" : "📷 Almashtirish"}
              </button>
              {productName && (
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiBusy}
                  className="btn-ghost !py-1 !px-2 !text-[11px]"
                  title="Mahsulot nomi bo'yicha rasm topadi yoki AI yaratadi"
                >
                  {aiBusy ? "🤖 Yaratilmoqda…" : "🤖 AI rasm"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="btn-ghost !py-1 !px-2 !text-[11px] !text-danger"
              >
                O‘chirish
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="btn-ghost !py-3 !text-sm"
            >
              {busy ? "Yuklanmoqda…" : "📷 Rasm yuklash"}
            </button>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiBusy || !productName}
              className="btn-ghost !py-3 !text-sm disabled:opacity-50"
              title={
                !productName
                  ? "Avval mahsulot nomini kiriting"
                  : "Unsplash'dan topadi yoki AI yaratadi"
              }
            >
              {aiBusy ? "🤖 Yaratilmoqda…" : "🤖 AI orqali"}
            </button>
          </div>
          <div className="text-[11px] text-muted text-center">
            yoki URL’ni quyiga yopishtiring
          </div>
          <input
            className="input !text-xs"
            placeholder="https://..."
            onChange={(e) => onChange(e.target.value.trim() || undefined)}
          />
        </div>
      )}
      {aiInfo && <div className="text-accent text-xs mt-1">{aiInfo}</div>}
      {err && <div className="text-danger text-xs mt-1">{err}</div>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
