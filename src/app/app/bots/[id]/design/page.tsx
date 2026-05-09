"use client";

// Design Studio — bot egasi AI generated brand kit + copy + hero image'ni ko'radi va
// "qabul qilish" yoki "qaytadan yaratish" qila oladi. Live preview Tailwind asosida.

import { useEffect, useState } from "react";

type DesignKit = {
  id: string;
  version: number;
  is_active: boolean;
  primary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  text_muted_color: string;
  gradient_from: string;
  gradient_to: string;
  font_heading: string;
  font_body: string;
  emoji_set: string[];
  logo_emoji: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  template_id: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  usp_items: Array<{ icon: string; title: string; description: string }>;
  about_text: string;
  testimonial_seeds: Array<{ name: string; text: string; rating: number }>;
  brand_voice: string;
  mood_keywords: string[];
};

const VERTICALS = [
  { id: "service", label: "Xizmatlar (B2B/Konsalting)" },
  { id: "salon", label: "Go'zallik saloni" },
  { id: "restaurant", label: "Restoran/Kafe" },
  { id: "shop", label: "Onlayn do'kon" },
  { id: "course", label: "Kurslar/Ta'lim" },
];

const MOODS = ["minimalist", "warm", "luxury", "energetic", "tech", "playful"];

export default function DesignStudioPage({ params }: { params: { id: string } }) {
  const [kit, setKit] = useState<DesignKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [vertical, setVertical] = useState("service");
  const [mood, setMood] = useState("minimalist");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [duration, setDuration] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);

  async function load() {
    const res = await fetch(`/api/bots/${params.id}/design/generate`);
    const data = await res.json();
    setKit(data.kit);
    setLoading(false);
  }

  async function generate() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/bots/${params.id}/design/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical, preferredMood: mood, language: "uz" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message ?? "Xato");
        return;
      }
      setKit(data.kit);
      setDuration(data.duration_ms);
      setCost(data.cost_usd);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yuklanmoqda…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          kit?.font_heading ?? "Inter"
        )}:wght@400;600;700;800&family=${encodeURIComponent(
          kit?.font_body ?? "Inter"
        )}:wght@400;500;600&display=swap`}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🎨 Design Studio</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI siz uchun brand kit, hero rasm va matnlarni avtomatik yaratadi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
          >
            {device === "desktop" ? "📱 Mobile" : "🖥 Desktop"}
          </button>
        </div>
      </div>

      {/* Generation controls */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Biznes turi
            </label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {VERTICALS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Mood
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={generating}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {generating ? "🎨 Yaratilmoqda…" : "✨ AI Generate"}
            </button>
          </div>
        </div>
        {duration !== null && (
          <div className="text-xs text-gray-500 flex gap-4">
            <span>⏱ {(duration / 1000).toFixed(1)}s</span>
            {cost !== null && <span>💵 ${cost.toFixed(4)}</span>}
            {kit?.brand_voice && <span>🎭 {kit.brand_voice}</span>}
            {kit?.mood_keywords && <span>🌈 {kit.mood_keywords.join(", ")}</span>}
          </div>
        )}
      </div>

      {/* Live preview */}
      {kit ? (
        <DesignPreview kit={kit} device={device} />
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
          Hali design generatsiya qilinmagan. Yuqorida "✨ AI Generate" tugmasini bosing.
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Live design preview — Tailwind + inline style (brand kit asosida)
// ════════════════════════════════════════════════════════════
function DesignPreview({ kit, device }: { kit: DesignKit; device: "desktop" | "mobile" }) {
  const isMobile = device === "mobile";
  const containerStyle: React.CSSProperties = {
    backgroundColor: kit.background_color,
    color: kit.text_color,
    fontFamily: kit.font_body,
  };
  const headingStyle: React.CSSProperties = { fontFamily: kit.font_heading };
  const heroBg: React.CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${kit.gradient_from}, ${kit.gradient_to})`,
  };

  return (
    <div
      className={`border rounded-xl shadow-lg overflow-hidden mx-auto transition-all ${
        isMobile ? "max-w-sm" : "max-w-full"
      }`}
      style={containerStyle}
    >
      {/* Color palette strip */}
      <div className="flex">
        {[
          kit.primary_color,
          kit.accent_color,
          kit.gradient_from,
          kit.gradient_to,
          kit.surface_color,
        ].map((c, i) => (
          <div key={i} className="flex-1 h-1.5" style={{ backgroundColor: c }} />
        ))}
      </div>

      {/* Hero */}
      <div className="relative" style={heroBg}>
        {kit.hero_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={kit.hero_image_url}
            alt={kit.hero_image_alt ?? ""}
            className="w-full h-[420px] object-cover opacity-90"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div
          className={`absolute inset-0 flex flex-col justify-center px-${isMobile ? "6" : "12"} text-white`}
        >
          <div className="text-4xl mb-3">{kit.logo_emoji}</div>
          <h1
            className="text-3xl md:text-5xl font-bold leading-tight max-w-2xl"
            style={headingStyle}
          >
            {kit.hero_headline}
          </h1>
          <p className="mt-3 max-w-xl text-base md:text-lg opacity-90">
            {kit.hero_subheadline}
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ backgroundColor: kit.primary_color, color: "#fff" }}
            >
              {kit.hero_cta_primary}
            </button>
            <button className="px-6 py-3 rounded-lg font-semibold border-2 border-white/70 text-white">
              {kit.hero_cta_secondary}
            </button>
          </div>
        </div>
      </div>

      {/* USP */}
      <div className="px-8 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {kit.usp_items.map((u, i) => (
            <div
              key={i}
              className="p-5 rounded-xl"
              style={{ backgroundColor: kit.surface_color }}
            >
              <div className="text-3xl">{u.icon}</div>
              <h3 className="mt-3 font-bold text-lg" style={headingStyle}>
                {u.title}
              </h3>
              <p className="mt-2 text-sm" style={{ color: kit.text_muted_color }}>
                {u.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="px-8 py-10" style={{ backgroundColor: kit.surface_color }}>
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ ...headingStyle, color: kit.primary_color }}
        >
          Biz haqimizda
        </h2>
        <p className="text-base leading-relaxed max-w-3xl">{kit.about_text}</p>
      </div>

      {/* Testimonials */}
      <div className="px-8 py-12">
        <h2 className="text-2xl font-bold mb-6" style={headingStyle}>
          Mijozlarimiz fikri
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {kit.testimonial_seeds.map((t, i) => (
            <div key={i} className="p-5 rounded-xl border" style={{ borderColor: kit.text_muted_color + "33" }}>
              <div className="text-yellow-500 mb-2">{"★".repeat(t.rating)}</div>
              <p className="text-sm italic">"{t.text}"</p>
              <div className="mt-3 text-xs font-semibold" style={{ color: kit.primary_color }}>
                — {t.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-8 py-6 text-xs flex flex-wrap gap-4 border-t" style={{ borderColor: kit.text_muted_color + "20", color: kit.text_muted_color }}>
        <span>v{kit.version}</span>
        <span>Template: {kit.template_id}</span>
        <span>Voice: {kit.brand_voice}</span>
        <span>Heading: {kit.font_heading}</span>
        <span>Body: {kit.font_body}</span>
        <span>{kit.emoji_set.join(" ")}</span>
      </div>
    </div>
  );
}
