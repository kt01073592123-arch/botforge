"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";

type Service = { name: string; price_uzs: number | null; duration: string | null };
type Faq = { q: string; a: string };
type Extracted = {
  business_name: string | null;
  services: Service[];
  contacts: {
    phone: string | null;
    address: string | null;
    instagram: string | null;
  };
  working_hours_text: string | null;
  faq: Faq[];
  notes: string | null;
};

type Stage = "input" | "preview" | "applying" | "done";

export default function ImportPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [stage, setStage] = useState<Stage>("input");
  const [text, setText] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [meta, setMeta] = useState<{ og_used: boolean } | null>(null);
  const [opts, setOpts] = useState({
    business_name: true,
    services: true,
    contacts: true,
    faq: true,
  });

  async function parse() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          instagram_url: instagramUrl.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setExtracted(d.extracted);
      setMeta(d.meta);
      setStage("preview");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!extracted) return;
    setStage("applying");
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apply: true,
          extracted,
          options: opts,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setStage("done");
      setTimeout(() => r.replace(`/app/bots/${id}/services`), 1500);
    } catch (e) {
      setErr((e as Error).message);
      setStage("preview");
    } finally {
      setBusy(false);
    }
  }

  // ───── INPUT bosqichi ─────
  if (stage === "input") {
    return (
      <div>
        <Topbar title="Avtomatik to'ldirish" back="back" />
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          <div className="panel p-4 text-sm leading-relaxed space-y-2">
            <div className="font-semibold text-base">📥 Bir paste bilan to'ldiring</div>
            <p className="text-muted">
              Instagram bio + 3-5 ta post matnini yopishtiring. AI xizmatlar, narxlar,
              telefon, manzil va FAQ’ni avtomatik ajratadi.
            </p>
            <div className="text-xs text-muted">
              💡 Hech narsa qo'lda kiritmaysiz — siz ko'rib tasdiqlaysiz.
            </div>
          </div>

          <div>
            <label className="label">Instagram URL (ixtiyoriy)</label>
            <input
              className="input"
              placeholder="https://instagram.com/your_studio yoki @your_studio"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
            <div className="text-xs text-muted mt-1">
              Profil ochiq bo'lsa, bio'ni avtomatik olib ko'rib chiqamiz. Ishlamasa zarar yo'q.
            </div>
          </div>

          <div>
            <label className="label">
              Bio + post matnlari{" "}
              <span className="text-muted normal-case">
                (asosiy — 200+ belgi bo'lsa yetadi)
              </span>
            </label>
            <textarea
              className="input min-h-[200px] font-mono text-xs"
              placeholder={`Misol:

Lash Studio Tashkent 💫
Klassik 250к, 2D 350к, 3D 450к
Lash lifting 300к
Adres: Mirobod, 12-uy
+998 90 123 45 67
@lash_studio_uz

📍 Bron uchun yozing
🕐 Du-Sh 10:00-20:00`}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="text-xs text-muted mt-1">
              {text.length.toLocaleString()} belgi
            </div>
          </div>

          {err && <div className="text-danger text-sm">{err}</div>}

          <button
            onClick={parse}
            disabled={busy || (!text.trim() && !instagramUrl.trim())}
            className="btn-primary w-full"
          >
            {busy ? "AI tahlil qilmoqda..." : "🪄 Ajratib ber"}
          </button>
        </div>
      </div>
    );
  }

  // ───── PREVIEW bosqichi ─────
  if (stage === "preview" && extracted) {
    return (
      <div>
        <Topbar title="Tasdiqlash" back="back" />
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          <div className="panel p-3 text-xs text-muted">
            {extracted.notes ?? "AI matnni tahlil qildi."}
            {meta?.og_used && (
              <div className="mt-1 text-success">✓ Instagram’dan ham olindi</div>
            )}
          </div>

          {extracted.business_name && (
            <Block
              title="🏢 Biznes nomi"
              checked={opts.business_name}
              onToggle={(v) => setOpts({ ...opts, business_name: v })}
            >
              <div className="text-sm">{extracted.business_name}</div>
            </Block>
          )}

          {extracted.services.length > 0 && (
            <Block
              title={`📋 Xizmatlar (${extracted.services.length})`}
              checked={opts.services}
              onToggle={(v) => setOpts({ ...opts, services: v })}
            >
              <div className="space-y-1.5">
                {extracted.services.map((s, i) => (
                  <ServiceRow
                    key={i}
                    service={s}
                    onChange={(updated) => {
                      const next = [...extracted.services];
                      next[i] = updated;
                      setExtracted({ ...extracted, services: next });
                    }}
                    onRemove={() => {
                      setExtracted({
                        ...extracted,
                        services: extracted.services.filter((_, j) => j !== i),
                      });
                    }}
                  />
                ))}
              </div>
            </Block>
          )}

          {(extracted.contacts.phone ||
            extracted.contacts.address ||
            extracted.contacts.instagram) && (
            <Block
              title="📞 Aloqa"
              checked={opts.contacts}
              onToggle={(v) => setOpts({ ...opts, contacts: v })}
            >
              <div className="space-y-1 text-sm">
                {extracted.contacts.phone && <div>Tel: {extracted.contacts.phone}</div>}
                {extracted.contacts.address && (
                  <div>Manzil: {extracted.contacts.address}</div>
                )}
                {extracted.contacts.instagram && (
                  <div>Instagram: @{extracted.contacts.instagram}</div>
                )}
              </div>
            </Block>
          )}

          {extracted.faq.length > 0 && (
            <Block
              title={`❓ FAQ (${extracted.faq.length})`}
              checked={opts.faq}
              onToggle={(v) => setOpts({ ...opts, faq: v })}
            >
              <div className="space-y-2">
                {extracted.faq.map((f, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">Q: {f.q}</div>
                    <div className="text-muted">A: {f.a}</div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {extracted.working_hours_text && (
            <div className="panel p-3 text-sm">
              <div className="text-xs text-muted uppercase tracking-wider mb-1">
                Ish vaqti (matnda topildi)
              </div>
              <div>{extracted.working_hours_text}</div>
              <div className="text-xs text-muted mt-1.5">
                💡 Ish vaqtini "Xizmatlar" sahifasida qo'lda sozlang
              </div>
            </div>
          )}

          {err && <div className="text-danger text-sm">{err}</div>}

          <div className="flex gap-2 sticky bottom-0 bg-bg pt-3 pb-2 -mx-4 px-4 border-t border-border">
            <button onClick={() => setStage("input")} className="btn-ghost">
              ← Qaytadan
            </button>
            <button onClick={apply} disabled={busy} className="btn-primary flex-1">
              {busy ? "Saqlanmoqda..." : "✓ Bot’ga qo'shish"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───── DONE / APPLYING ─────
  return (
    <div>
      <Topbar title="Saqlash" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        {stage === "applying" ? (
          <>
            <div className="text-4xl mb-3 animate-pulse">⚙️</div>
            <div className="text-sm text-muted">Bot’ga qo'shilmoqda...</div>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3">✓</div>
            <div className="font-bold mb-1">Tayyor!</div>
            <div className="text-sm text-muted">
              Xizmatlar sahifasiga o'tilmoqda...
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Block({
  title,
  checked,
  onToggle,
  children,
}: {
  title: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-4">
      <label className="flex items-center gap-2 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="font-semibold text-sm">{title}</span>
      </label>
      <div className={checked ? "" : "opacity-40"}>{children}</div>
    </div>
  );
}

function ServiceRow({
  service,
  onChange,
  onRemove,
}: {
  service: Service;
  onChange: (s: Service) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-center text-sm">
      <input
        className="input !py-1.5 flex-1 text-xs"
        value={service.name}
        onChange={(e) => onChange({ ...service, name: e.target.value })}
      />
      <input
        className="input !py-1.5 w-28 text-xs"
        type="number"
        placeholder="UZS"
        value={service.price_uzs ?? ""}
        onChange={(e) =>
          onChange({
            ...service,
            price_uzs: e.target.value ? Number(e.target.value) : null,
          })
        }
      />
      <button
        onClick={onRemove}
        className="text-danger text-lg px-1"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
