"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import type { BotRow } from "@/lib/supabase/types";

type Stats = {
  conversations_total: number;
  conversations_today: number;
  leads_total: number;
  leads_today: number;
  messages_today: number;
  cost_usd_30d: number;
};

type BrandKit = {
  primary_color?: string;
  accent_color?: string;
  gradient?: string;
  text_on_primary?: string;
  emoji_set?: string[];
};

export default function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [bot, setBot] = useState<BotRow | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [busy, setBusy] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);

  useEffect(() => {
    refresh();
    fetch(`/api/bots/${id}/stats`).then((r) => r.json()).then((d) => setStats(d.stats));
    if (typeof window !== "undefined") {
      const key = `bf_onboard_${id}`;
      const dismissed = localStorage.getItem(key) === "1";
      setOnboardingDismissed(dismissed);
    }
  }, [id]);

  function dismissOnboarding() {
    setOnboardingDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`bf_onboard_${id}`, "1");
    }
  }

  // Bot’ning template’idagi brand_kit ni olamiz
  useEffect(() => {
    if (!bot?.template_id) return;
    fetch(`/api/templates/${bot.template_id}`)
      .then((r) => r.json())
      .then((d) => setBrandKit(d.pack?.brand_kit ?? null));
  }, [bot?.template_id]);

  async function refresh() {
    const d = await fetch(`/api/bots/${id}`).then((r) => r.json());
    if (d.bot) {
      setBot(d.bot);
      setToken(d.token);
    }
  }

  async function activate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/activate`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) alert(d.error);
      await refresh();
    } finally { setBusy(false); }
  }

  async function pause() {
    setBusy(true);
    try {
      await fetch(`/api/bots/${id}/pause`, { method: "POST" });
      await refresh();
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm("Botni o‘chirmoqchimisiz? Webhook olib tashlanadi.")) return;
    setBusy(true);
    try {
      await fetch(`/api/bots/${id}`, { method: "DELETE" });
      r.replace("/app/bots");
    } finally { setBusy(false); }
  }

  if (!bot) {
    return (
      <div>
        <Topbar title="Bot" back="/app/bots" />
        <div className="text-sm text-muted text-center py-10">Yuklanmoqda…</div>
      </div>
    );
  }

  const headerGradient =
    brandKit?.gradient ??
    (brandKit?.primary_color && brandKit?.accent_color
      ? `linear-gradient(135deg, ${brandKit.primary_color} 0%, ${brandKit.accent_color} 100%)`
      : null);

  return (
    <div>
      <Topbar title={bot.name} back="/app/bots" right={<StatusBadge status={bot.status} />} />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Brand kit bilan biznes header */}
        {headerGradient ? (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: headerGradient, color: brandKit?.text_on_primary ?? "white" }}
          >
            <div className="text-3xl">{(brandKit?.emoji_set ?? ["🤖"])[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{bot.business_name ?? bot.name}</div>
              {bot.tg_username ? (
                <a
                  href={`https://t.me/${bot.tg_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs opacity-90 underline"
                >
                  @{bot.tg_username}
                </a>
              ) : (
                <Link
                  href={`/app/bots/${id}/connect`}
                  className="text-xs opacity-90 underline"
                >
                  Token ulash →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="panel p-4">
            <div className="text-sm text-muted">{bot.business_name ?? "—"}</div>
            {bot.tg_username ? (
              <a href={`https://t.me/${bot.tg_username}`} target="_blank" rel="noopener noreferrer" className="text-accent text-sm">
                @{bot.tg_username} →
              </a>
            ) : (
              <Link href={`/app/bots/${id}/connect`} className="text-accent text-sm">
                Token ulash →
              </Link>
            )}
          </div>
        )}
        <div className="panel p-4 hidden">
          <div className="text-sm text-muted">{bot.business_name ?? "—"}</div>
          {token && <div className="text-xs text-muted mt-2 font-mono">{token}</div>}
        </div>

        {/* Onboarding hint — birinchi marta + servicelar bo'sh bo'lsa */}
        {!onboardingDismissed && bot.tg_username && (
          <OnboardingChecklist
            botId={id}
            tgUsername={bot.tg_username}
            onDismiss={dismissOnboarding}
          />
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Bugun suhbat" value={stats?.conversations_today ?? "·"} />
          <Stat label="Bugun lead" value={stats?.leads_today ?? "·"} />
          <Stat label="Bugun xabar" value={stats?.messages_today ?? "·"} />
          <Stat label="Jami suhbat" value={stats?.conversations_total ?? "·"} />
          <Stat label="Jami lead" value={stats?.leads_total ?? "·"} />
          <Stat
            label="30 kun AI ($)"
            value={stats ? Number(stats.cost_usd_30d).toFixed(3) : "·"}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NavCard href={`/app/bots/${id}/share`} icon="📲" title="Ulashish + QR" />
          <NavCard href={`/app/bots/${id}/services`} icon="📋" title="Xizmatlar va narxlar" />
          <NavCard href={`/app/bots/${id}/bookings`} icon="📅" title="Bronlar" />
          <NavCard href={`/app/bots/${id}/orders`} icon="🛒" title="Buyurtmalar" />
          <NavCard href={`/app/bots/${id}/customers`} icon="👥" title="Mijozlar (CRM)" />
          <NavCard href={`/app/bots/${id}/import`} icon="📥" title="Avtomatik to‘ldirish" />
          <NavCard href={`/app/bots/${id}/kb`} icon="📚" title="Bilim bazasi" />
          <NavCard href={`/app/bots/${id}/conversations`} icon="💬" title="Suhbatlar" />
          <NavCard href={`/app/bots/${id}/leads`} icon="📞" title="Leadlar" />
          <NavCard href={`/app/bots/${id}/reviews`} icon="⭐" title="Sharhlar" />
          <NavCard href={`/app/bots/${id}/loyalty`} icon="🎫" title="Sodiqlik dasturi" />
          <NavCard href={`/app/bots/${id}/promo`} icon="🎟" title="Promo kodlar" />
          <NavCard href={`/app/bots/${id}/broadcast`} icon="📣" title="Xabar tarqatish" />
          <NavCard href={`/app/bots/${id}/revenue`} icon="💰" title="Daromad" />
          <NavCard href={`/app/bots/${id}/analytics`} icon="📊" title="Analytics" />
          <NavCard href={`/app/bots/${id}/ab-test`} icon="🧪" title="A/B test welcome" />
          <NavCard href={`/app/bots/${id}/diagnostics`} icon="🩺" title="Bot Doctor" />
          <NavCard href={`/app/bots/${id}/settings`} icon="⚙️" title="Sozlamalar" />
        </div>

        <div className="flex gap-2">
          {bot.status === "active" ? (
            <button onClick={pause} disabled={busy} className="btn-ghost flex-1">
              ⏸ Pauza
            </button>
          ) : (
            <button
              onClick={activate}
              disabled={busy || !bot.tg_bot_id}
              className="btn-primary flex-1"
            >
              ▶ Botni faollashtirish
            </button>
          )}
          <button
            onClick={async () => {
              const name = prompt("Yangi bot nomi:", bot.name + " (kopiya)");
              if (!name) return;
              setBusy(true);
              try {
                const res = await fetch(`/api/bots/${id}/duplicate`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                const d = await res.json();
                if (!res.ok) {
                  alert(d.error);
                  return;
                }
                r.replace(`/app/bots/${d.bot.id}/connect`);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="btn-ghost"
          >
            📋 Klon
          </button>
          <button onClick={remove} disabled={busy} className="btn-danger">
            O‘chirish
          </button>
        </div>

        {!bot.tg_bot_id && (
          <div className="text-xs text-amber-400 text-center">
            Botni ishga tushirish uchun avval BotFather tokenini ulang
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Yangi bot egasi uchun checklist — 4 ta qadam.
// localStorage'da yopilgan bo'lsa qaytarib chiqmaydi.
function OnboardingChecklist({
  botId,
  tgUsername,
  onDismiss,
}: {
  botId: string;
  tgUsername: string;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState<{
    services: number;
    customButtons: boolean;
    promo: boolean;
    isPublic: boolean;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bots/${botId}/data`).then((r) => r.json()),
      fetch(`/api/bots/${botId}/promo`).then((r) => r.json()),
      fetch(`/api/bots/${botId}/explore`).then((r) => r.json()),
    ]).then(([data, promo, explore]) => {
      setProgress({
        services: (data.data?.services ?? []).length,
        customButtons: !!data.data?.custom_buttons,
        promo: (promo.codes ?? []).length > 0,
        isPublic: !!explore.bot?.is_public,
      });
    }).catch(() => setProgress(null));
  }, [botId]);

  if (!progress) return null;

  const steps = [
    { done: progress.services > 0, label: `Mahsulot qo'shish (${progress.services})`, href: `/app/bots/${botId}/services` },
    { done: true, label: "Telegram'da /start sinab ko'rish", href: `https://t.me/${tgUsername}`, external: true },
    { done: progress.promo, label: "Promo kod yaratish (ixtiyoriy)", href: `/app/bots/${botId}/promo` },
    { done: progress.isPublic, label: "Galereyaga qo'shish", href: `/app/bots/${botId}/share` },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  // Hammasi tugaganda banner avtomatik yashirinadi
  if (completed === steps.length) return null;

  return (
    <div className="panel p-4 border-accent/40 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-bold">🚀 Botni to'liq sozlash</div>
          <div className="text-[11px] text-muted mt-0.5">
            {completed}/{steps.length} qadam · {pct}% tayyor
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs text-muted hover:text-text"
          aria-label="Yopish"
        >
          ✕
        </button>
      </div>

      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <a
            key={i}
            href={s.href}
            target={s.external ? "_blank" : undefined}
            rel={s.external ? "noopener noreferrer" : undefined}
            className={`flex items-center gap-2 text-sm py-1 ${s.done ? "opacity-50" : ""}`}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: s.done ? "#10B981" : "rgba(0,0,0,0.06)",
                color: s.done ? "#fff" : "#6B6B7B",
              }}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className={s.done ? "line-through" : ""}>{s.label}</span>
            {!s.done && <span className="text-muted text-xs ml-auto">→</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

function NavCard({ href, icon, title }: { href: string; icon: string; title: string }) {
  return (
    <Link href={href} className="panel p-4 hover:border-accent transition">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm font-semibold">{title}</div>
    </Link>
  );
}
