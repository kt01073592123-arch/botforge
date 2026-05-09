"use client";

// AI Prompt'dan bot + sayt yaratish sahifasi.
// Foydalanuvchi 1-2 jumlada biznesini tasvirlaydi -> BeautyShop sklet ustiga AI generatsiya
// qiladi -> preview ko'rsatadi -> "Yaratish" bossa bot DB'ga yoziladi va sayt dizayni
// fonda tayyorlanadi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import clsx from "clsx";

type Service = { name: string; base_price_uzs: number; duration?: string };
type FaqItem = { q: string; a: string };
type Broadcast = { title: string; text: string; suggested_segment: string };
type BrandKit = {
  primary_color: string;
  accent_color: string;
  background_tint: string;
  text_on_primary: string;
  emoji_set: string[];
  font_hint: string;
  gradient: string;
};

type GeneratedConfig = {
  vertical: "shop" | "salon" | "restaurant" | "course" | "service";
  business_type: string;
  system_prompt: string;
  welcome_message: string;
  buttons: { text: string }[];
  services: Service[];
  faq: FaqItem[];
  working_hours: Record<string, [number, number] | null>;
  contacts: { phone?: string; address?: string; instagram?: string };
  sample_broadcasts: Broadcast[];
  brand_kit: BrandKit;
  reasoning: string;
};

const EXAMPLES: { label: string; prompt: string; vertical: GeneratedConfig["vertical"] }[] = [
  {
    label: "💄 Kosmetika do'koni",
    prompt:
      "Toshkentdagi premium kosmetika do'koni. Korea va Yevropa brendlari. Mijozlarga AI kosmetolog maslahat berishi kerak. Yetkazib berish, keshbek tizimi bor.",
    vertical: "shop",
  },
  {
    label: "🍕 Pitsa restorani",
    prompt:
      "Italian style pitsa restorani, Toshkent Yunusobod. 12 xil pitsa, salatlar, ichimliklar. Yetkazib berish 30 daqiqada. Mijoz menyuni ko'rib, savatga solib buyurtma berishi kerak.",
    vertical: "restaurant",
  },
  {
    label: "💇 Beauty salon",
    prompt:
      "Premium beauty salon - soch, manikyur, kosmetolog. Bron tizimi, master tanlash, ish vaqti ko'rsatish. Iliq, do'stona ohangda muloqot.",
    vertical: "salon",
  },
  {
    label: "📚 Online kurslar",
    prompt:
      "IT online kurslar markazi. Frontend, backend, Python, dizayn yo'nalishlari. Mijoz kursni tanlab, demo darsga yozilishi va to'lov qilishi kerak.",
    vertical: "course",
  },
];

export default function FromPromptPage() {
  const r = useRouter();
  const [prompt, setPrompt] = useState("");
  const [botName, setBotName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [vertical, setVertical] = useState<GeneratedConfig["vertical"] | "">("");
  const [config, setConfig] = useState<GeneratedConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [costUsd, setCostUsd] = useState(0);
  const [generateSite, setGenerateSite] = useState(true);

  async function onGenerate() {
    setErr(null);
    if (prompt.trim().length < 10) {
      setErr("Iltimos, biznesingizni kamida 10 ta belgida tasvirlang");
      return;
    }
    setBusy(true);
    setConfig(null);
    try {
      const res = await fetch("/api/templates/from-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          botName: botName || undefined,
          businessName: businessName || undefined,
          verticalHint: vertical || undefined,
          create: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generatsiya muvaffaqiyatsiz");
      setConfig(data.config as GeneratedConfig);
      setCostUsd(data.cost_usd ?? 0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    if (!config || !botName.trim()) {
      setErr("Bot nomini kiriting (eng kamida 2 ta belgi)");
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/templates/from-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          botName,
          businessName: businessName || undefined,
          verticalHint: vertical || undefined,
          create: true,
          name: botName,
          generateSite,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bot yaratishda xato");
      const id = data.bot?.id;
      if (id) {
        r.push(`/app/bots/${id}`);
      } else {
        setErr("Bot yaratildi, lekin ID qaytmadi");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const useExample = (ex: (typeof EXAMPLES)[number]) => {
    setPrompt(ex.prompt);
    setVertical(ex.vertical);
  };

  return (
    <div>
      <Topbar title="✨ AI'dan bot + sayt" back="/app/bots/new" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        {/* HERO */}
        <div className="panel p-4 border border-border">
          <div className="text-sm font-semibold mb-1">
            Botingiz va saytingizni 1-2 jumlada tasvirlang
          </div>
          <div className="text-xs text-muted leading-snug mb-3">
            BeautyShop pattern (Mini App + AI consultant + cashback) sklet
            sifatida ishlatiladi. AI siz bergan tasvirga qarab tugmalar,
            mahsulotlar, FAQ, brand va to&apos;liq sayt dizayni (hero rasm,
            copy, bloklar) ni avtomatik yaratadi.
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy || creating}
            rows={4}
            placeholder="Misol: Toshkentdagi kosmetika do'koni. Korea brendlari. Mijozga AI kosmetolog teri parvarishi bo'yicha maslahat berishi kerak. Yetkazib berish 1-2 kun ichida."
            className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-accent resize-none"
            maxLength={2000}
          />
          <div className="text-[11px] text-muted text-right mt-1">
            {prompt.length}/2000
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <input
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              disabled={busy || creating}
              placeholder="Bot nomi (Beauty UZ)"
              className="px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-accent"
              maxLength={80}
            />
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={busy || creating}
              placeholder="Biznes nomi (ixtiyoriy)"
              className="px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-accent"
              maxLength={120}
            />
          </div>

          {/* Vertical chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(["", "shop", "salon", "restaurant", "course", "service"] as const).map((v) => (
              <button
                key={v || "auto"}
                onClick={() => setVertical(v as typeof vertical)}
                disabled={busy || creating}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs border transition",
                  vertical === v
                    ? "bg-accent text-white border-accent"
                    : "bg-bg border-border text-muted hover:border-accent",
                )}
              >
                {v === "" && "🤖 Auto-aniqla"}
                {v === "shop" && "🛒 Do'kon"}
                {v === "salon" && "💇 Salon"}
                {v === "restaurant" && "🍕 Restoran"}
                {v === "course" && "📚 Kurs"}
                {v === "service" && "🛠 Xizmat"}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onGenerate}
              disabled={busy || creating || prompt.trim().length < 10}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {busy ? "🔮 AI ishlamoqda..." : "✨ Generatsiya qilish"}
            </button>
          </div>

          {err && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-xs">
              ⚠️ {err}
            </div>
          )}
        </div>

        {/* EXAMPLES */}
        {!config && !busy && (
          <div>
            <div className="text-xs text-muted uppercase tracking-wider mb-2">
              💡 Tezkor namunalar
            </div>
            <div className="grid gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => useExample(ex)}
                  className="panel p-3 text-left hover:border-accent transition border border-border"
                >
                  <div className="text-sm font-semibold">{ex.label}</div>
                  <div className="text-xs text-muted leading-snug mt-0.5 line-clamp-2">
                    {ex.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {config && <ConfigPreview config={config} costUsd={costUsd} />}

        {/* CREATE BUTTON */}
        {config && (
          <div className="panel p-4 border border-border sticky bottom-2 bg-bg/95 backdrop-blur">
            <div className="text-xs text-muted mb-2">
              Yoqdimi? Bot yarating - keyin token ulang va ishga tushiring.
            </div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={generateSite}
                onChange={(e) => setGenerateSite(e.target.checked)}
                className="accent-accent w-4 h-4"
              />
              <span className="font-medium">🎨 Sayt dizayni ham AI yaratsin</span>
              <span className="text-muted">
                (brand, hero rasm, copy, blok layout - fonda ~30 sek)
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={onGenerate}
                disabled={busy || creating}
                className="btn-ghost px-4 disabled:opacity-50"
              >
                🔄 Qayta
              </button>
              <button
                onClick={onCreate}
                disabled={creating || busy || !botName.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {creating ? "Yaratilmoqda..." : "🚀 Bot yaratish"}
              </button>
            </div>
            {!botName.trim() && (
              <div className="text-[11px] text-amber-500 mt-2">
                ⚠️ Bot nomini kiriting (yuqorida)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PREVIEW
// ============================================================
function ConfigPreview({
  config,
  costUsd,
}: {
  config: GeneratedConfig;
  costUsd: number;
}) {
  const bk = config.brand_kit;
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted uppercase tracking-wider">
        🎨 AI generatsiyasi - ${costUsd.toFixed(4)}
      </div>

      {/* Brand kit */}
      <div className="panel overflow-hidden border border-border">
        <div
          className="h-20 flex items-center px-5 relative"
          style={{ background: bk.gradient }}
        >
          <div className="text-3xl drop-shadow-md">
            {bk.emoji_set?.[0] ?? "✨"}
          </div>
          <div className="absolute right-4 top-3 flex gap-1">
            {(bk.emoji_set ?? []).slice(1, 5).map((e, i) => (
              <span key={i} className="text-lg opacity-70">
                {e}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-2">
          <div>
            <div className="font-bold text-base">{config.business_type}</div>
            <div className="text-xs text-muted leading-snug mt-0.5">
              Vertical: {config.vertical} - Font: {bk.font_hint}
            </div>
          </div>
          <div className="text-xs italic px-3 py-2 bg-bg rounded-lg border border-border">
            &ldquo;{config.welcome_message}&rdquo;
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <ColorChip color={bk.primary_color} label="Primary" />
            <ColorChip color={bk.accent_color} label="Accent" />
            <ColorChip color={bk.background_tint} label="BG" />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <Section title="📲 Bot tugmalari">
        <div className="flex flex-wrap gap-2">
          {config.buttons.map((b, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg bg-bg border border-border text-xs"
            >
              {b.text}
            </span>
          ))}
        </div>
      </Section>

      {/* Services */}
      {config.services.length > 0 && (
        <Section title={`🛍 Mahsulot/xizmatlar (${config.services.length})`}>
          <div className="grid gap-1.5">
            {config.services.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-bg border border-border rounded-lg text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  {s.duration && (
                    <div className="text-muted text-[11px]">{s.duration}</div>
                  )}
                </div>
                <div className="font-semibold whitespace-nowrap ml-2">
                  {s.base_price_uzs.toLocaleString("uz-UZ")} so&apos;m
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {config.faq.length > 0 && (
        <Section title={`❓ FAQ (${config.faq.length})`}>
          <div className="space-y-1.5">
            {config.faq.map((f, i) => (
              <details
                key={i}
                className="px-3 py-2 bg-bg border border-border rounded-lg text-xs"
              >
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <div className="text-muted mt-1.5 leading-snug">{f.a}</div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Broadcasts */}
      {config.sample_broadcasts.length > 0 && (
        <Section title={`📣 Broadcast namunalari (${config.sample_broadcasts.length})`}>
          <div className="space-y-1.5">
            {config.sample_broadcasts.map((b, i) => (
              <div
                key={i}
                className="px-3 py-2 bg-bg border border-border rounded-lg text-xs"
              >
                <div className="font-medium">{b.title}</div>
                <div className="text-muted leading-snug mt-1">{b.text}</div>
                <div className="text-[10px] text-muted mt-1 uppercase">
                  → {b.suggested_segment}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* System prompt */}
      <Section title="🤖 AI System prompt">
        <pre className="text-[11px] text-muted whitespace-pre-wrap leading-snug bg-bg border border-border rounded-lg p-3 max-h-64 overflow-auto">
          {config.system_prompt}
        </pre>
      </Section>

      {/* Reasoning */}
      {config.reasoning && (
        <div className="text-xs text-muted italic px-3 py-2 bg-bg rounded-lg border border-border">
          💭 {config.reasoning}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-xs text-muted uppercase tracking-wider mb-2">{title}</div>
      {children}
    </section>
  );
}

function ColorChip({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg border border-border text-[11px]">
      <div
        className="w-3 h-3 rounded-sm border border-border"
        style={{ background: color }}
      />
      <span className="text-muted">{label}</span>
      <code className="text-text">{color}</code>
    </div>
  );
}
