"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type AbResult = {
  variant: "A" | "B";
  conversations: number;
  orders: number;
  orders_completed: number;
  revenue_uzs: number;
  order_rate_pct: number;
};

type AbData = {
  days: number;
  welcome_a: string | null;
  welcome_b: string | null;
  ab_active: boolean;
  results: AbResult[];
};

export default function AbTestPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [variantB, setVariantB] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, days]);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/bots/${id}/ab-test?days=${days}`).then((r) => r.json());
    setData(r);
    setVariantB(r.welcome_b ?? "");
    setLoading(false);
  }

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/bots/${id}/ab-test`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcome_message_b: variantB.trim() || null,
        }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!confirm("A/B test'ni to'xtatish? Variant B o'chiriladi (statistika qoladi)")) return;
    setVariantB("");
    setBusy(true);
    try {
      await fetch(`/api/bots/${id}/ab-test`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ welcome_message_b: null }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <div>
        <Topbar title="A/B test" back="back" />
        <div className="p-8 text-center text-muted text-sm">Yuklanmoqda…</div>
      </div>
    );
  }

  const a = data.results.find((r) => r.variant === "A");
  const b = data.results.find((r) => r.variant === "B");
  const winner =
    a && b && a.conversations > 0 && b.conversations > 0
      ? a.order_rate_pct > b.order_rate_pct
        ? "A"
        : b.order_rate_pct > a.order_rate_pct
          ? "B"
          : "tie"
      : null;

  return (
    <div>
      <Topbar title="🧪 A/B test welcome xabar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="text-xs text-muted leading-relaxed">
          A/B test — yangi mijozlarning yarmiga A variantini, yarmiga B variantini
          yuborib, qaysi welcome xabar ko&apos;p mijoz buyurtmasini qaytarayotganini
          aniqlaysiz. Mijoz bir xil variantni har doim ko&apos;radi.
        </div>

        {data.ab_active && (
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  days === d
                    ? "bg-accent text-white border-accent"
                    : "bg-panel border-border text-muted"
                }`}
              >
                {d} kun
              </button>
            ))}
          </div>
        )}

        {/* Natijalar */}
        {data.ab_active && a && b && (a.conversations > 0 || b.conversations > 0) && (
          <div className="grid grid-cols-2 gap-2">
            <VariantCard
              letter="A"
              text={data.welcome_a ?? ""}
              result={a}
              winner={winner === "A"}
            />
            <VariantCard
              letter="B"
              text={data.welcome_b ?? ""}
              result={b}
              winner={winner === "B"}
            />
          </div>
        )}

        {winner && winner !== "tie" && (
          <div className="panel p-3 border-success/40 text-sm">
            🏆 <b>Variant {winner}</b> g&apos;olib chiqyapti — buyurtma foizi ko&apos;proq.
            Bu variantni asosiy welcome'ga ko&apos;chirib, A/B test'ni to&apos;xtating.
          </div>
        )}

        {/* Variant editors */}
        <div className="panel p-4 space-y-3">
          <div className="text-sm font-semibold">Variant A (asosiy)</div>
          <div className="text-xs text-muted">
            /app/bots/[id]/settings sahifasida tahrir qiling
          </div>
          <div className="text-xs whitespace-pre-wrap p-2 rounded bg-panel/50 border border-border">
            {data.welcome_a ?? "(bo'sh)"}
          </div>
        </div>

        <div className="panel p-4 space-y-3">
          <div className="text-sm font-semibold">Variant B (alternative)</div>
          <textarea
            className="input min-h-[120px]"
            placeholder="Boshqacha welcome xabar yozing — masalan, qisqaroq, yoki konkretroq CTA bilan..."
            value={variantB}
            onChange={(e) => setVariantB(e.target.value)}
            maxLength={2000}
          />
          <div className="text-[11px] text-muted">
            Bo&apos;sh qoldirsangiz A/B test ishga tushmaydi (faqat variant A jo&apos;natiladi)
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="btn-primary flex-1 !text-sm"
            >
              {busy ? "Saqlanmoqda…" : data.ab_active ? "Yangilash" : "🚀 A/B test'ni boshlash"}
            </button>
            {data.ab_active && (
              <button onClick={stop} disabled={busy} className="btn-ghost !text-sm">
                ⏹ To&apos;xtatish
              </button>
            )}
          </div>
        </div>

        {data.ab_active && (!a || a.conversations === 0) && (!b || b.conversations === 0) && (
          <div className="panel p-4 text-xs text-muted text-center">
            Hali yangi /start yozgan mijozlar yo&apos;q. Bot mijozlarga ulashilgach
            natijalar shu yerda paydo bo&apos;ladi.
          </div>
        )}
      </div>
    </div>
  );
}

function VariantCard({
  letter,
  text,
  result,
  winner,
}: {
  letter: "A" | "B";
  text: string;
  result: { conversations: number; orders: number; order_rate_pct: number; revenue_uzs: number };
  winner: boolean;
}) {
  return (
    <div className={`panel p-3 ${winner ? "border-accent" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-extrabold">
          {letter}
          {winner && " 🏆"}
        </div>
        <div className="text-xs text-muted">{result.conversations} mijoz</div>
      </div>
      <div className="text-[11px] text-muted line-clamp-2 leading-snug mb-2">
        {text || "(bo'sh)"}
      </div>
      <div className="space-y-1 pt-2 border-t border-border">
        <Stat label="Buyurtma foizi" value={`${result.order_rate_pct}%`} highlight />
        <Stat label="Buyurtmalar" value={result.orders} />
        <Stat
          label="Daromad"
          value={`${(result.revenue_uzs / 1000).toFixed(0)}k`}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${highlight ? "text-accent" : ""}`}>{value}</span>
    </div>
  );
}
