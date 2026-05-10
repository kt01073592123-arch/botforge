"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type { Plan } from "@/lib/billing";
import clsx from "clsx";

type PlanWithSub = {
  plans: Plan[];
  subscription: { sub: { plan_id: string; current_period_end: string | null }; plan: Plan } | null;
};

export default function BillingPage() {
  const [data, setData] = useState<PlanWithSub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [provider, setProvider] = useState<"click" | "payme">("click");

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function checkout(planId: string) {
    setBusy(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, provider }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error);
        return;
      }
      window.open(d.url, "_blank");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <div className="p-8 text-center text-muted">Yuklanmoqda…</div>;

  const currentPlanId = data.subscription?.sub.plan_id ?? "free";

  return (
    <div>
      <Topbar title="Tariflar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {data.subscription && (
          <div className="panel p-4">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">Hozirgi tarif</div>
            <div className="font-semibold text-lg">{data.subscription.plan.name}</div>
            {data.subscription.sub.current_period_end && (
              <div className="text-xs text-muted">
                Tugash: {new Date(data.subscription.sub.current_period_end).toLocaleDateString("uz")}
              </div>
            )}
          </div>
        )}

        {/* To'lov turi */}
        <div className="panel p-3">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            To&apos;lov tizimi
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setProvider("click")}
              className={clsx(
                "panel p-2.5 text-sm transition",
                provider === "click" && "border-accent",
              )}
            >
              <div className="font-bold">Click</div>
              <div className="text-[11px] text-muted">UzCard, Humo</div>
            </button>
            <button
              onClick={() => setProvider("payme")}
              className={clsx(
                "panel p-2.5 text-sm transition",
                provider === "payme" && "border-accent",
              )}
            >
              <div className="font-bold">Payme</div>
              <div className="text-[11px] text-muted">Karta + balans</div>
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {data.plans.map((p) => {
            const isCurrent = p.id === currentPlanId;
            return (
              <div
                key={p.id}
                className={clsx(
                  "panel p-4",
                  isCurrent && "border-accent",
                  p.id === "pro" && !isCurrent && "border-accent2/50"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg">{p.name}</div>
                    <div className="text-xs text-muted">
                      {p.bot_limit} bot · {p.message_limit.toLocaleString()} xabar/oy
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {p.price_uzs === 0 ? "Bepul" : `${p.price_uzs.toLocaleString()} so‘m`}
                    </div>
                    {p.price_uzs > 0 && <div className="text-xs text-muted">/ oy</div>}
                  </div>
                </div>
                <ul className="text-xs text-muted space-y-1 mb-3">
                  {(p.features as string[]).map((f, i) => (
                    <li key={i}>✓ {f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="text-xs text-success text-center">Joriy tarif</div>
                ) : p.id === "free" ? (
                  <div className="text-xs text-muted text-center">Standart</div>
                ) : (
                  <button
                    onClick={() => checkout(p.id)}
                    disabled={busy === p.id}
                    className="btn-primary w-full"
                  >
                    {busy === p.id ? "Ochilmoqda…" : `${p.name} tarifiga o‘tish`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs text-muted text-center">
          To&apos;lov {provider === "click" ? "Click" : "Payme"} orqali. Karta saqlanmaydi, har oy mustaqil to&apos;laysiz.
        </div>
      </div>
    </div>
  );
}
