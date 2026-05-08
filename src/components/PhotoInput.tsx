"use client";

import { useRef, useState } from "react";

export default function PhotoInput({
  botId,
  value,
  onChange,
}: {
  botId: string;
  value: string | undefined;
  onChange: (url: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="btn-ghost !py-1 !px-2 !text-[11px]"
              >
                {busy ? "Yuklanmoqda…" : "📷 Almashtirish"}
              </button>
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-ghost w-full !py-3 !text-sm"
          >
            {busy ? "Yuklanmoqda…" : "📷 Rasm yuklash"}
          </button>
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
