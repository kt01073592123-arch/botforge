"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import clsx from "clsx";

type SubType = { id: string; name: string; description: string; icon: string };
type Tier = { id: string; name: string; multiplier: number };
type Tone = { id: string; name: string };
type BrandKit = {
  primary_color?: string;
  accent_color?: string;
  gradient?: string;
  emoji_set?: string[];
};
type Resolved = {
  services: { name: string; price: string; duration?: string }[];
};
type PackData = {
  id: string;
  name: string;
  icon: string;
  description: string;
  is_pack: boolean;
  brand_kit: BrandKit;
  sub_types: SubType[];
  price_tiers: Tier[];
  tones: Tone[];
  default_welcome: string;
};

type Step = 0 | 1 | 2 | 3 | 4;

export default function WizardPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [pack, setPack] = useState<PackData | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [subType, setSubType] = useState<string | undefined>();
  const [tier, setTier] = useState<string>("mid");
  const [tone, setTone] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [enableMiniApp, setEnableMiniApp] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pack ma’lumotini birinchi marta olish — auto-defaults bilan.
  // Bu effect faqat id ga bog‘liq, keyingi qadam o‘zgarishi qayta render bermaydi.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.pack) return;
        setPack(d.pack);
        setResolved(d.resolved);
        // Default tanlovlar — agar hali tanlanmagan bo‘lsa
        if (d.pack.sub_types?.length) {
          setSubType((cur) =>
            cur ?? d.pack.sub_types[Math.floor(d.pack.sub_types.length / 2)]?.id
          );
        }
        if (d.pack.tones?.length) {
          setTone((cur) => {
            if (cur) return cur;
            const friendly = d.pack.tones.find((t: Tone) => t.id === "friendly");
            return friendly?.id ?? d.pack.tones[0].id;
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Choice o‘zgarganda faqat resolved (live preview narxlari) qayta yuklanadi.
  // Pack o‘zi qayta yuklanmaydi — input elementlari mount’dan tushmaydi.
  useEffect(() => {
    if (!pack) return;
    const params = new URLSearchParams();
    if (subType) params.set("sub_type", subType);
    params.set("tier", tier);
    if (tone) params.set("tone", tone);
    let cancelled = false;
    fetch(`/api/templates/${id}?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.resolved) setResolved(d.resolved);
      });
    return () => {
      cancelled = true;
    };
  }, [id, pack, subType, tier, tone]);

  const totalSteps = pack?.is_pack ? 4 : 1;
  const progress = useMemo(
    () => Math.round(((step + 1) / (totalSteps + 1)) * 100),
    [step, totalSteps]
  );

  async function submit() {
    if (!name) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: id,
          name,
          businessName: businessName || undefined,
          language: "uz",
          subTypeId: subType,
          tierId: tier,
          toneId: tone,
          enableMiniApp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      r.replace(`/app/bots/${data.bot.id}/connect`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!pack) {
    return (
      <div>
        <Topbar title="Yuklanmoqda…" back="back" />
        <div className="text-center text-muted py-10 text-sm">…</div>
      </div>
    );
  }

  const bk = pack.brand_kit;
  const headerBg =
    bk.gradient ?? `linear-gradient(135deg, ${bk.primary_color} 0%, ${bk.accent_color} 100%)`;

  return (
    <div>
      <Topbar title={pack.name} back="back" />

      {/* Progress bar */}
      <div className="max-w-3xl mx-auto px-4 pt-3">
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${progress}%`, background: bk.accent_color ?? "#7c5cff" }}
          />
        </div>
        <div className="text-[11px] text-muted mt-1.5">
          Qadam {step + 1} / {totalSteps + 1}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        {/* Pack header */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: headerBg, color: "white" }}
        >
          <div className="text-4xl">{pack.icon}</div>
          <div>
            <div className="font-bold">{pack.name}</div>
            <div className="text-xs opacity-90">{pack.description}</div>
          </div>
        </div>

        {/* Step content */}
        {step === 0 && pack.is_pack && pack.sub_types.length > 0 && (
          <Step
            title="Sizning biznesingiz qaysi turda?"
            subtitle="Bot ohangi va mantig‘i shu tanlovga moslashadi"
          >
            <div className="grid gap-2">
              {pack.sub_types.map((s) => (
                <ChoiceCard
                  key={s.id}
                  selected={subType === s.id}
                  onClick={() => setSubType(s.id)}
                  icon={s.icon}
                  title={s.name}
                  desc={s.description}
                  accent={bk.accent_color}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 1 && pack.is_pack && (
          <Step
            title="Narxingiz qaysi darajada?"
            subtitle="Hamma xizmat narxlari avtomatik moslashadi (keyin tahrirlash mumkin)"
          >
            <div className="grid grid-cols-2 gap-2">
              {pack.price_tiers.map((t) => (
                <ChoiceCard
                  key={t.id}
                  selected={tier === t.id}
                  onClick={() => setTier(t.id)}
                  title={t.name}
                  desc={t.id === "budget" ? "−40%" : t.id === "mid" ? "Standart" : t.id === "premium" ? "+50%" : "+150%"}
                  accent={bk.accent_color}
                />
              ))}
            </div>
            {resolved?.services && resolved.services.length > 0 && (
              <div className="panel p-3 mt-3 space-y-1">
                <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
                  Misol narxlari
                </div>
                {resolved.services.slice(0, 4).map((s, i) => (
                  <div key={i} className="text-xs flex justify-between">
                    <span className="text-muted">{s.name}</span>
                    <span className="font-medium">{s.price}</span>
                  </div>
                ))}
              </div>
            )}
          </Step>
        )}

        {step === 2 && pack.is_pack && pack.tones.length > 0 && (
          <Step
            title="Bot qanday gaplashsin?"
            subtitle="Mijoz bilan ohangi"
          >
            <div className="grid gap-2">
              {pack.tones.map((t) => (
                <ChoiceCard
                  key={t.id}
                  selected={tone === t.id}
                  onClick={() => setTone(t.id)}
                  icon={
                    t.id === "formal" ? "🎩" :
                    t.id === "friendly" ? "🤗" :
                    t.id === "luxury" ? "👑" :
                    t.id === "medical" ? "👩‍⚕️" :
                    t.id === "technical" ? "🔧" :
                    t.id === "academic" ? "🎓" : "💬"
                  }
                  title={t.name}
                  accent={bk.accent_color}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            title="Biznesingiz ma'lumotlari"
            subtitle="Faqat 2 ta maydon — qolganini keyin to‘ldirasiz"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name) setStep(4);
              }}
              className="space-y-3"
              autoComplete="off"
            >
              <div>
                <label htmlFor="bot-name" className="label">
                  Bot nomi (ichki)
                </label>
                <input
                  id="bot-name"
                  name="bot_name"
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Lash Studio Manager"
                  required
                  minLength={2}
                  autoComplete="off"
                  inputMode="text"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="biz-name" className="label">
                  Biznes nomi (mijoz ko‘radi)
                </label>
                <input
                  id="biz-name"
                  name="business_name"
                  type="text"
                  className="input"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Masalan: Lash Studio Tashkent"
                  autoComplete="off"
                  inputMode="text"
                />
              </div>
              {/* Hidden submit so Enter key works on mobile keyboards */}
              <button type="submit" className="hidden" />
            </form>
          </Step>
        )}

        {step === 4 && (
          <Step
            title="Tasdiq"
            subtitle="Hammasi to‘g‘rimi?"
          >
            <div className="panel p-4 space-y-3">
              <Row label="Bot turi" value={pack.name} />
              {subType && (
                <Row
                  label="Sub-tip"
                  value={pack.sub_types.find((s) => s.id === subType)?.name ?? ""}
                />
              )}
              {pack.is_pack && (
                <Row
                  label="Narx darajasi"
                  value={pack.price_tiers.find((t) => t.id === tier)?.name ?? ""}
                />
              )}
              {tone && (
                <Row label="Ohang" value={pack.tones.find((t) => t.id === tone)?.name ?? ""} />
              )}
              <Row label="Bot nomi" value={name || "—"} />
              <Row label="Biznes nomi" value={businessName || "—"} />
            </div>

            {resolved && (
              <div className="panel p-4 mt-3 space-y-2">
                <div className="text-[11px] text-muted uppercase tracking-wider">
                  Avtomatik to‘ldirilayotgan
                </div>
                <div className="text-sm">
                  ✓ {resolved.services?.length ?? 0} ta xizmat narxlar bilan
                </div>
                <div className="text-sm">✓ FAQ va ish vaqti</div>
                <div className="text-sm">✓ AI promt + ohang sozlangan</div>
                <div className="text-sm">✓ Brand rangi pack uslubida</div>
              </div>
            )}

            {/* Mini App toggle — bot tugmalariga "📱 Mini App" qo'shish */}
            <label
              className="panel p-3 mt-3 flex items-start gap-3 cursor-pointer transition active:scale-[0.99]"
              style={{
                borderColor: enableMiniApp ? pack.brand_kit.accent_color : undefined,
              }}
            >
              <input
                type="checkbox"
                checked={enableMiniApp}
                onChange={(e) => setEnableMiniApp(e.target.checked)}
                className="mt-1 w-4 h-4 cursor-pointer"
                style={{ accentColor: pack.brand_kit.accent_color }}
              />
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  📱 Mini App tugmasini bot menyusiga qo‘shish
                </div>
                <div className="text-xs text-muted mt-0.5 leading-snug">
                  Bot Telegram menyusida “Mini App” tugmasi paydo bo‘ladi —
                  mijoz mahsulot/xizmat ko‘rishi uchun. Pack’da allaqachon bor
                  bo‘lsa o‘zgarmaydi.
                </div>
              </div>
            </label>
          </Step>
        )}

        {err && <div className="text-danger text-sm">{err}</div>}

        {/* Navigation */}
        <div className="flex gap-2 sticky bottom-0 bg-bg pt-3 pb-2 -mx-4 px-4 border-t border-border">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => (Math.max(0, s - 1) as Step))}
              className="btn-ghost"
            >
              ← Orqaga
            </button>
          )}
          {step < totalSteps ? (
            <button
              onClick={() => {
                // Pack’siz template’da subType/tier/tone bosqichlarini o‘tkazib yuboramiz
                if (!pack.is_pack) {
                  setStep(3);
                  return;
                }
                setStep((s) => Math.min(totalSteps, s + 1) as Step);
              }}
              disabled={
                (step === 0 && pack.is_pack && !subType) ||
                (step === 2 && pack.is_pack && !tone) ||
                (step === 3 && !name)
              }
              className="btn-primary flex-1"
            >
              Davom etish →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={busy || !name}
              className="btn-primary flex-1"
            >
              {busy ? "Yaratilmoqda…" : "🚀 Bot yaratish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-muted mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  accent,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: string;
  title: string;
  desc?: string;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "panel p-3 text-left transition",
        selected && "ring-2"
      )}
      style={{
        borderColor: selected ? accent : undefined,
        boxShadow: selected ? `0 0 0 1px ${accent}` : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="text-2xl">{icon}</div>}
        <div className="flex-1">
          <div className="font-semibold text-sm">{title}</div>
          {desc && <div className="text-xs text-muted leading-snug mt-0.5">{desc}</div>}
        </div>
        {selected && <div className="text-xl" style={{ color: accent }}>✓</div>}
      </div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
