"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type ShareInfo = {
  bot_username: string;
  deep_link: string;
  landing_url: string;
  qr_data_url: string;
  brand_kit: {
    primary_color?: string;
    accent_color?: string;
    gradient?: string;
  } | null;
  business_name: string;
};

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [polishMsg, setPolishMsg] = useState<string | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [exploreState, setExploreState] = useState<{
    is_public: boolean;
    description: string | null;
    explore_category: string | null;
  } | null>(null);
  const [explBusy, setExplBusy] = useState(false);
  const [explSaved, setExplSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/bots/${id}/share`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setPolishMsg(d.error);
        else setInfo(d);
      });
    fetch(`/api/bots/${id}/explore`)
      .then((r) => r.json())
      .then((d) => {
        if (d.bot) setExploreState(d.bot);
      });
  }, [id]);

  async function saveExplore(patch: Partial<NonNullable<typeof exploreState>>) {
    if (!exploreState) return;
    setExplBusy(true);
    setExplSaved(false);
    try {
      const next = { ...exploreState, ...patch };
      setExploreState(next);
      const res = await fetch(`/api/bots/${id}/explore`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setExplSaved(true);
        setTimeout(() => setExplSaved(false), 1500);
      }
    } finally {
      setExplBusy(false);
    }
  }

  async function applyPolish() {
    setPolishing(true);
    setPolishMsg(null);
    try {
      const res = await fetch(`/api/bots/${id}/polish`, { method: "POST" });
      const d = await res.json();
      if (d.ok) {
        setPolishMsg(
          `✓ Telegram’da bot nomi, ta'rif va komandalar yangilandi. Botni yangidan oching ko‘rish uchun.`
        );
      } else {
        setPolishMsg(`⚠️ ${d.errors?.join(", ") ?? d.error ?? "xato"}`);
      }
    } finally {
      setPolishing(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Telegram WebApp clipboard limitidan
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.showAlert) tg.showAlert(`Nusxa: ${text}`);
    }
  }

  if (!info) {
    return (
      <div>
        <Topbar title="Ulashish" back="back" />
        <div className="text-center text-muted py-10 text-sm">
          {polishMsg ?? "Yuklanmoqda…"}
        </div>
      </div>
    );
  }

  const bk = info.brand_kit ?? {};
  const gradient =
    bk.gradient ??
    `linear-gradient(135deg, ${bk.primary_color ?? "#7c5cff"} 0%, ${bk.accent_color ?? "#19c37d"} 100%)`;

  return (
    <div>
      <Topbar title="Ulashish" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Brand header */}
        <div
          className="rounded-2xl p-5 text-white text-center"
          style={{ background: gradient }}
        >
          <div className="text-2xl font-bold">{info.business_name}</div>
          <div className="text-sm opacity-90 mt-0.5">@{info.bot_username}</div>
        </div>

        {/* QR code */}
        <div className="panel p-5 text-center">
          <h2 className="text-base font-bold mb-1">QR kod</h2>
          <p className="text-xs text-muted mb-4">
            Salonda chop etib qo‘ying — mijoz scan qilsa to‘g‘ridan to‘g‘ri botga kiradi
          </p>
          <div className="inline-block bg-white p-3 rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.qr_data_url}
              alt="QR"
              className="w-56 h-56"
            />
          </div>
          <div className="mt-3">
            <a
              href={info.qr_data_url}
              download={`botforge-qr-${info.bot_username}.png`}
              className="btn-primary !py-2 !text-xs inline-block"
            >
              ⬇ PNG yuklab olish
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="panel p-4 space-y-3">
          <h2 className="text-sm font-bold">Linklar</h2>

          <LinkRow
            label="Telegram bot"
            value={info.deep_link}
            onCopy={() => copy(info.deep_link, "tg")}
            copied={copied === "tg"}
            href={info.deep_link}
          />

          <LinkRow
            label="Public landing"
            value={info.landing_url}
            onCopy={() => copy(info.landing_url, "lp")}
            copied={copied === "lp"}
            href={info.landing_url}
            note="Mijozga ushbu link yuboring — Instagram bio yoki sayt linkasi sifatida"
          />
        </div>

        {/* Marketplace toggle */}
        {exploreState && (
          <div className="panel p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">🌍 Galeriya (marketplace)</h2>
                <p className="text-xs text-muted leading-snug mt-0.5">
                  Botingiz <a href="/explore" target="_blank" rel="noopener noreferrer" className="text-accent">/explore</a>{" "}
                  sahifasida ko&apos;rinsin. Yangi mijozlar topish.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={exploreState.is_public}
                  onChange={(e) => saveExplore({ is_public: e.target.checked })}
                  disabled={explBusy}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-accent transition" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-5" />
              </label>
            </div>
            {exploreState.is_public && (
              <>
                <div>
                  <label className="label">Qisqa tavsif (galeriyada ko&apos;rinadi)</label>
                  <textarea
                    className="input min-h-[60px] !text-xs"
                    placeholder="Masalan: Premium kosmetika do'koni, Korea brendlari, Toshkent ichida bepul yetkazib berish"
                    value={exploreState.description ?? ""}
                    onChange={(e) =>
                      setExploreState({ ...exploreState, description: e.target.value })
                    }
                    onBlur={() => saveExplore({ description: exploreState.description })}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="label">Kategoriya</label>
                  <select
                    className="input !text-xs"
                    value={exploreState.explore_category ?? ""}
                    onChange={(e) =>
                      saveExplore({
                        explore_category: e.target.value || null,
                      })
                    }
                  >
                    <option value="">— template'dan auto —</option>
                    <option value="shop">🛒 Do&apos;kon</option>
                    <option value="salon">💇 Salon</option>
                    <option value="restaurant">🍽 Restoran</option>
                    <option value="service">🔧 Xizmat</option>
                    <option value="course">📚 Ta&apos;lim</option>
                    <option value="clinic">🩺 Klinika</option>
                    <option value="fitness">💪 Fitnes</option>
                    <option value="other">📦 Boshqa</option>
                  </select>
                </div>
              </>
            )}
            {explSaved && <div className="text-xs text-success">✓ Saqlandi</div>}
          </div>
        )}

        {/* Polish */}
        <div className="panel p-4">
          <h2 className="text-sm font-bold mb-1">Telegram brendlash</h2>
          <p className="text-xs text-muted mb-3">
            Bot nomi, ta'rif va komandalarni avtomatik sozlaydi (pack’ga muvofiq).
            Mijoz botni ochsa darhol professional ko‘rinadi.
          </p>
          <button
            onClick={applyPolish}
            disabled={polishing}
            className="btn-primary w-full !text-sm"
          >
            {polishing ? "Yuborilmoqda…" : "✨ Brendlashni qo‘llash"}
          </button>
          {polishMsg && (
            <div className="text-xs text-muted mt-2 leading-relaxed">{polishMsg}</div>
          )}
        </div>

        {/* Tips */}
        <div className="panel p-4 text-xs text-muted leading-relaxed space-y-1">
          <div className="font-semibold text-text mb-1">💡 Maslahatlar</div>
          <div>• QR kod salonda kassa, ko‘zguada yoki kirish eshigida bo‘lsin</div>
          <div>• Public landing’ni Instagram bio link sifatida ulang</div>
          <div>• Statistika sahifasida konversiya qancha mijoz keldi ko‘rishingiz mumkin</div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  value,
  href,
  onCopy,
  copied,
  note,
}: {
  label: string;
  value: string;
  href: string;
  onCopy: () => void;
  copied: boolean;
  note?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="flex gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="input flex-1 !py-2 !text-xs font-mono truncate text-accent"
        >
          {value}
        </a>
        <button
          onClick={onCopy}
          className="btn-ghost !py-2 !px-3 !text-xs"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>
      {note && <div className="text-[10px] text-muted mt-1">{note}</div>}
    </div>
  );
}
