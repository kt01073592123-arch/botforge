"use client";

// /app/bots/[id]/theme — bot egasi rang sxemasini tanlaydi.
// 4 ta tayyor preset (kosmetika/kiyim/elektronika/oziq-ovqat) + custom.

import { useEffect, useState } from "react";

type Preset = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
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
};

const FONTS = [
  "Inter", "Playfair Display", "Montserrat", "Poppins", "DM Serif Display",
  "Cormorant Garamond", "Space Grotesk", "Bricolage Grotesque", "Outfit",
  "DM Sans", "Manrope", "Plus Jakarta Sans", "Lato",
];

export default function ThemePage({ params }: { params: { id: string } }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activeKit, setActiveKit] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"presets" | "custom">("presets");
  const [custom, setCustom] = useState({
    primary_color: "#0F172A",
    accent_color: "#3B82F6",
    background_color: "#FFFFFF",
    surface_color: "#F8FAFC",
    text_color: "#0F172A",
    text_muted_color: "#64748B",
    gradient_from: "#3B82F6",
    gradient_to: "#8B5CF6",
    font_heading: "Inter",
    font_body: "Inter",
    logo_emoji: "✨",
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/bots/" + params.id + "/theme").then((r) => r.json()),
      fetch("/api/bots/" + params.id + "/design/generate").then((r) => r.json()).catch(() => ({})),
    ]).then(([presetData, kitData]) => {
      setPresets(presetData.presets ?? []);
      const k = kitData.kit;
      if (k) {
        setActiveKit(k as Preset);
        setCustom({
          primary_color: k.primary_color ?? "#0F172A",
          accent_color: k.accent_color ?? "#3B82F6",
          background_color: k.background_color ?? "#FFFFFF",
          surface_color: k.surface_color ?? "#F8FAFC",
          text_color: k.text_color ?? "#0F172A",
          text_muted_color: k.text_muted_color ?? "#64748B",
          gradient_from: k.gradient_from ?? k.primary_color ?? "#3B82F6",
          gradient_to: k.gradient_to ?? k.accent_color ?? "#8B5CF6",
          font_heading: k.font_heading ?? "Inter",
          font_body: k.font_body ?? "Inter",
          logo_emoji: k.logo_emoji ?? "✨",
        });
      }
      setLoading(false);
    });
  }, [params.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function applyPreset(p: Preset) {
    if (saving) return;
    if (!confirm(`"${p.name}" sxemasini qo'llaymizmi? Mavjud rang/font o'zgaradi.`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bots/" + params.id + "/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: p.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message ?? "Xato");
      } else {
        setActiveKit(data.kit);
        showToast("✅ " + p.name + " qo'llandi");
      }
    } finally {
      setSaving(false);
    }
  }

  async function applyCustom() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bots/" + params.id + "/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message ?? data.error ?? "Xato");
      } else {
        setActiveKit(data.kit);
        showToast("✅ Custom ranglar qo'llandi");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Yuklanmoqda...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎨 Sayt rang sxemasi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tayyor sxemadan birini tanlang yoki o'zingiz ranglar belgilang.
          O'zgarishlar darhol /shop va /site sahifalarida ko'rinadi.
        </p>
      </div>

      {/* Hozirgi aktiv */}
      {activeKit && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
            Hozirgi aktiv sxema
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-2xl">{activeKit.logo_emoji}</div>
            <div className="flex gap-1.5 flex-1">
              {[
                activeKit.primary_color,
                activeKit.accent_color,
                activeKit.gradient_from,
                activeKit.gradient_to,
                activeKit.background_color,
              ].map((c, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500">
              <div>{activeKit.font_heading}</div>
              <div className="opacity-60">{activeKit.font_body}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("presets")}
          className={`px-4 py-2 font-semibold text-sm border-b-2 ${
            tab === "presets" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          🎁 Tayyor sxemalar
        </button>
        <button
          onClick={() => setTab("custom")}
          className={`px-4 py-2 font-semibold text-sm border-b-2 ${
            tab === "custom" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          🎨 O'zim tanlayman
        </button>
      </div>

      {/* PRESETS */}
      {tab === "presets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((p) => {
            const isActive = activeKit?.primary_color === p.primary_color;
            return (
              <div
                key={p.id}
                className={`border-2 rounded-xl overflow-hidden bg-white transition cursor-pointer hover:shadow-lg ${
                  isActive ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                }`}
                onClick={() => applyPreset(p)}
              >
                {/* Hero preview */}
                <div
                  className="h-32 relative flex items-center px-5"
                  style={{
                    background: `linear-gradient(135deg, ${p.gradient_from}, ${p.gradient_to})`,
                  }}
                >
                  <div className="text-4xl mr-3">{p.emoji}</div>
                  <div style={{ color: "white" }}>
                    <div
                      style={{ fontFamily: p.font_heading, fontWeight: 700, fontSize: 18 }}
                    >
                      {p.name}
                    </div>
                    <div className="text-xs opacity-90 mt-1">{p.category}</div>
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-white text-blue-600 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                      ✓
                    </div>
                  )}
                </div>

                {/* Content preview */}
                <div className="p-4" style={{ backgroundColor: p.background_color }}>
                  <div
                    style={{
                      fontFamily: p.font_heading,
                      color: p.text_color,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    Hero matni — {p.font_heading}
                  </div>
                  <div
                    style={{
                      fontFamily: p.font_body,
                      color: p.text_muted_color,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {p.description}
                  </div>
                  <div className="flex gap-2 mt-3 items-center">
                    <button
                      style={{
                        backgroundColor: p.primary_color,
                        color: "white",
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: "none",
                      }}
                    >
                      Sotib olish
                    </button>
                    <div className="flex gap-1">
                      {[p.primary_color, p.accent_color, p.gradient_to].map((c, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">
                      {p.emoji_set.slice(0, 5).join(" ")}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
                  <span>{isActive ? "✓ Aktiv" : "Qo'llash uchun bosing"}</span>
                  {isActive && <span className="text-blue-500 font-semibold">Joriy</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CUSTOM */}
      {tab === "custom" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Color pickers */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm">Ranglar</h3>
            {(
              [
                ["primary_color", "Asosiy rang (tugmalar)"],
                ["accent_color", "Aksent rang"],
                ["background_color", "Fon rangi"],
                ["surface_color", "Karta foni"],
                ["text_color", "Matn rangi"],
                ["text_muted_color", "Yumshoq matn"],
                ["gradient_from", "Gradient — boshi"],
                ["gradient_to", "Gradient — oxiri"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-xs flex-1">{label}</label>
                <input
                  type="color"
                  value={custom[key]}
                  onChange={(e) => setCustom({ ...custom, [key]: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <input
                  type="text"
                  value={custom[key]}
                  onChange={(e) => setCustom({ ...custom, [key]: e.target.value })}
                  className="w-24 border rounded px-2 py-1 text-xs font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            ))}

            <h3 className="font-bold text-sm pt-3">Shrift</h3>
            <div>
              <label className="text-xs text-gray-600">Sarlavha shrifti</label>
              <select
                value={custom.font_heading}
                onChange={(e) => setCustom({ ...custom, font_heading: e.target.value })}
                className="w-full border rounded px-3 py-2 mt-1 text-sm"
              >
                {FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Asosiy matn shrifti</label>
              <select
                value={custom.font_body}
                onChange={(e) => setCustom({ ...custom, font_body: e.target.value })}
                className="w-full border rounded px-3 py-2 mt-1 text-sm"
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Logo emoji</label>
              <input
                type="text"
                value={custom.logo_emoji}
                onChange={(e) => setCustom({ ...custom, logo_emoji: e.target.value })}
                className="w-full border rounded px-3 py-2 mt-1 text-sm"
                maxLength={4}
              />
            </div>

            <button
              onClick={applyCustom}
              disabled={saving}
              className="w-full mt-4 py-3 bg-blue-600 text-white rounded font-semibold disabled:opacity-50"
            >
              {saving ? "Saqlanmoqda..." : "💾 Custom sozlamani qo'llash"}
            </button>
          </div>

          {/* Live preview */}
          <div>
            <h3 className="font-bold text-sm mb-3">Jonli ko'rinish</h3>
            <link
              rel="stylesheet"
              href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
                custom.font_heading
              )}:wght@600;700&family=${encodeURIComponent(custom.font_body)}:wght@400;500&display=swap`}
            />
            <div className="border rounded-xl overflow-hidden shadow-md">
              <div
                className="h-32 px-5 flex items-center"
                style={{
                  background: `linear-gradient(135deg, ${custom.gradient_from}, ${custom.gradient_to})`,
                }}
              >
                <div className="text-4xl mr-3">{custom.logo_emoji}</div>
                <div style={{ color: "white", fontFamily: custom.font_heading, fontWeight: 700, fontSize: 18 }}>
                  Sizning Do'koningiz
                </div>
              </div>
              <div className="p-5" style={{ backgroundColor: custom.background_color }}>
                <div
                  style={{
                    fontFamily: custom.font_heading,
                    color: custom.text_color,
                    fontWeight: 700,
                    fontSize: 22,
                  }}
                >
                  Mahsulot nomi
                </div>
                <div
                  style={{
                    fontFamily: custom.font_body,
                    color: custom.text_muted_color,
                    fontSize: 14,
                    marginTop: 6,
                  }}
                >
                  Bu — sizning ranglaringizdagi karta misoli. Mahsulot tavsifi shu yerda ko'rsatiladi.
                </div>
                <div
                  className="mt-4 p-3 rounded-lg flex justify-between items-center"
                  style={{ backgroundColor: custom.surface_color }}
                >
                  <div>
                    <div className="text-xs" style={{ color: custom.text_muted_color }}>
                      Narx
                    </div>
                    <div
                      style={{
                        color: custom.text_color,
                        fontFamily: custom.font_heading,
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      199 000 so'm
                    </div>
                  </div>
                  <button
                    style={{
                      backgroundColor: custom.primary_color,
                      color: "white",
                      padding: "10px 18px",
                      borderRadius: 10,
                      fontWeight: 700,
                      border: "none",
                      fontFamily: custom.font_body,
                      fontSize: 13,
                    }}
                  >
                    Sotib olish
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              💡 Saqlangach <code className="bg-gray-100 px-1 rounded">/shop/[username]</code> va <code className="bg-gray-100 px-1 rounded">/site/[username]</code> sahifalarida darhol ko'rinadi.
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg z-50 font-semibold text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
