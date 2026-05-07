"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import clsx from "clsx";

type SampleBroadcast = {
  title: string;
  text: string;
  suggested_segment: "all" | "leads" | "converted" | "no_lead";
};

type Bcast = {
  id: string;
  text: string;
  segment: "all" | "leads" | "converted" | "no_lead";
  status: "draft" | "queued" | "sending" | "done" | "cancelled";
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

const SEGMENTS = [
  { v: "all", label: "Barchasi" },
  { v: "leads", label: "Lead bergan" },
  { v: "converted", label: "Mijoz bo‘lganlar" },
  { v: "no_lead", label: "Lead bermaganlar" },
] as const;

export default function BroadcastPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Bcast[]>([]);
  const [samples, setSamples] = useState<SampleBroadcast[]>([]);
  const [text, setText] = useState("");
  const [segment, setSegment] = useState<Bcast["segment"]>("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load();
    fetch(`/api/bots/${id}/broadcast/templates`)
      .then((r) => r.json())
      .then((d) => setSamples(d.samples ?? []));
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id]);

  async function load() {
    const d = await fetch(`/api/bots/${id}/broadcast`).then((r) => r.json());
    setItems(d.broadcasts ?? []);
  }

  function applySample(s: SampleBroadcast) {
    setText(s.text);
    setSegment(s.suggested_segment);
    // Form ga scroll
    document.getElementById("bc-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function send() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, segment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setText("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(bcId: string) {
    if (!confirm("Yuborishni to‘xtatamizmi?")) return;
    await fetch(`/api/bots/${id}/broadcast/${bcId}`, { method: "POST" });
    await load();
  }

  return (
    <div>
      <Topbar title="Xabar tarqatish" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <div className="panel p-4 text-xs text-muted leading-relaxed">
          <div className="font-semibold text-text mb-1">📣 Eslatma</div>
          Spam yuborsangiz Telegram bot’ni cheklab qo‘yadi. Yangi taklif, dam olish kuni
          aksiyasi yoki chinakam foydali xabar yuboring. Xabarlar har daqiqada 25 ta yuboriladi
          (Telegram limit).
        </div>

        {/* Tayyor namunalar (template’dan) */}
        {samples.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2">
              ✨ Tayyor namunalar
            </h2>
            <p className="text-xs text-muted mb-3">
              Bossangiz forma to‘ldiriladi — tahrir qilib yuboring
            </p>
            <div className="grid gap-2">
              {samples.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySample(s)}
                  className="panel p-3 text-left hover:border-accent transition"
                >
                  <div className="text-sm font-semibold mb-1">{s.title}</div>
                  <div className="text-xs text-muted leading-snug whitespace-pre-wrap line-clamp-3">
                    {s.text}
                  </div>
                  <div className="text-[10px] text-accent mt-1.5 uppercase tracking-wider">
                    {s.suggested_segment === "all" && "Barchaga"}
                    {s.suggested_segment === "leads" && "Lead bergan"}
                    {s.suggested_segment === "converted" && "Mijoz bo‘lganlar"}
                    {s.suggested_segment === "no_lead" && "Lead bermaganlar"}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div id="bc-form" className="panel p-4 space-y-3">
          <div>
            <label className="label">Kim ko‘rishini tanlang</label>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENTS.map((s) => (
                <button
                  key={s.v}
                  onClick={() => setSegment(s.v)}
                  className={clsx(
                    "rounded-xl px-3 py-2 text-sm border transition",
                    segment === s.v
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-panel text-muted"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Xabar matni</label>
            <textarea
              className="input min-h-[120px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Salom! Bu hafta yangi taklif: 20% chegirma..."
              required
              minLength={2}
            />
            <div className="text-xs text-muted mt-1">{text.length} belgi · max 4000</div>
          </div>
          {err && <div className="text-danger text-sm">{err}</div>}
          <button
            className="btn-primary w-full"
            onClick={send}
            disabled={busy || text.length < 2}
          >
            {busy ? "Yuborilmoqda…" : "Yuborish"}
          </button>
        </div>

        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted uppercase tracking-wider">
            Tarix
          </h2>
          {items.length === 0 ? (
            <div className="text-center text-muted text-sm py-4">Hali yuborilmadi</div>
          ) : (
            <div className="grid gap-2">
              {items.map((b) => (
                <div key={b.id} className="panel p-3">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="text-xs text-muted">
                      {new Date(b.created_at).toLocaleString("uz")} ·{" "}
                      {SEGMENTS.find((s) => s.v === b.segment)?.label}
                    </div>
                    <span
                      className={clsx(
                        "badge",
                        b.status === "done" && "border-success/40 text-success",
                        b.status === "sending" && "border-accent/40 text-accent bg-accent/10",
                        b.status === "queued" && "border-amber-500/40 text-amber-400",
                        b.status === "cancelled" && "border-muted/40 text-muted",
                        b.status === "draft" && "border-muted/40 text-muted"
                      )}
                    >
                      {b.status === "done"
                        ? "Yuborildi"
                        : b.status === "sending"
                        ? "Yuborilmoqda"
                        : b.status === "queued"
                        ? "Navbatda"
                        : b.status === "cancelled"
                        ? "Bekor qilindi"
                        : "Loyiha"}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words mb-2">{b.text}</div>
                  <div className="text-xs text-muted">
                    {b.sent_count}/{b.total_recipients} yuborildi
                    {b.failed_count > 0 && ` · ${b.failed_count} xato`}
                  </div>
                  {(b.status === "queued" || b.status === "sending") && (
                    <button
                      onClick={() => cancel(b.id)}
                      className="btn-ghost !py-1 !px-2 !text-xs !text-danger mt-2"
                    >
                      To‘xtatish
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
