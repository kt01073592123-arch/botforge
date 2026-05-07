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

  useEffect(() => {
    refresh();
    fetch(`/api/bots/${id}/stats`).then((r) => r.json()).then((d) => setStats(d.stats));
  }, [id]);

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

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Bugun suhbat" value={stats?.conversations_today ?? "·"} />
          <Stat label="Bugun lead" value={stats?.leads_today ?? "·"} />
          <Stat label="Bugun xabar" value={stats?.messages_today ?? "·"} />
          <Stat label="Jami suhbat" value={stats?.conversations_total ?? "·"} />
          <Stat label="Jami lead" value={stats?.leads_total ?? "·"} />
          <Stat
            label="30 kun AI ($)"
            value={stats ? stats.cost_usd_30d.toFixed(3) : "·"}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NavCard href={`/app/bots/${id}/services`} icon="📋" title="Xizmatlar va narxlar" />
          <NavCard href={`/app/bots/${id}/kb`} icon="📚" title="Bilim bazasi" />
          <NavCard href={`/app/bots/${id}/conversations`} icon="💬" title="Suhbatlar" />
          <NavCard href={`/app/bots/${id}/leads`} icon="📞" title="Leadlar" />
          <NavCard href={`/app/bots/${id}/broadcast`} icon="📣" title="Xabar tarqatish" />
          <NavCard href={`/app/bots/${id}/analytics`} icon="📊" title="Analytics" />
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

function NavCard({ href, icon, title }: { href: string; icon: string; title: string }) {
  return (
    <Link href={href} className="panel p-4 hover:border-accent transition">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm font-semibold">{title}</div>
    </Link>
  );
}
