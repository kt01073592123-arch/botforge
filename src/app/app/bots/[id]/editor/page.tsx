"use client";

// Visual block editor — bot egasi sahifa qismlarini ↑↓ ko'chiradi, yashiradi yoki
// custom CSS qo'shadi. Mobile/Desktop preview iframe.

import { useEffect, useMemo, useState } from "react";

type Block = { type: string; order: number; props?: Record<string, unknown> };
type Page = {
  id: string;
  blocks: Block[];
  custom_css: string | null;
  custom_head: string | null;
  title: string | null;
  meta_description: string | null;
};

const BLOCK_LABELS: Record<string, string> = {
  hero: "🎯 Hero (banner)",
  features: "⭐ Afzalliklar",
  services: "💼 Xizmatlar",
  menu: "📋 Menyu",
  products: "🛍 Mahsulotlar",
  modules: "📚 Modullar",
  gallery: "🖼 Galereya",
  testimonials: "💬 Sharhlar",
  stats: "📊 Statistika",
  about: "📖 Biz haqimizda",
  pricing: "💰 Tariflar",
  faq: "❓ FAQ",
  cta_banner: "🔔 CTA banner",
  working_hours: "🕒 Ish vaqti",
  contact: "📞 Kontakt",
};

const ALL_TYPES = Object.keys(BLOCK_LABELS);

export default function EditorPage({ params }: { params: { id: string } }) {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showCss, setShowCss] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  async function load() {
    const res = await fetch(`/api/bots/${params.id}/page`);
    const data = await res.json();
    setPage(data.page);
    setLoading(false);
  }

  async function save(patch: Partial<Page>) {
    if (!page || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${params.id}/page`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        setPage(data.page);
        // Preview'ni yangilashga sabab beramiz (cache bypass)
        setPreviewUrl((u) => u + (u.includes("?") ? "&" : "?") + "_t=" + Date.now());
      } else {
        alert(data.message ?? "Saqlash xatosi");
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!page) return;
    // Bot username ni topish kerak — endpointdan olamiz
    fetch(`/api/bots/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        const username = d.bot?.tg_username;
        if (username) setPreviewUrl(`/site/${username}`);
      });
  }, [page, params.id]);

  function move(idx: number, dir: -1 | 1) {
    if (!page) return;
    const blocks = [...page.blocks];
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    [blocks[idx], blocks[j]] = [blocks[j], blocks[idx]];
    blocks.forEach((b, i) => (b.order = i));
    save({ blocks });
  }

  function remove(idx: number) {
    if (!page) return;
    if (!confirm("Bu blokni o'chirib tashlash?")) return;
    const blocks = page.blocks.filter((_, i) => i !== idx);
    blocks.forEach((b, i) => (b.order = i));
    save({ blocks });
  }

  function addBlock(type: string) {
    if (!page) return;
    const blocks = [...page.blocks, { type, order: page.blocks.length }];
    save({ blocks });
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Yuklanmoqda…</div>;
  if (!page) return <div className="p-8 text-center text-red-500">Sahifa topilmadi</div>;

  const usedTypes = new Set(page.blocks.map((b) => b.type));
  const availableTypes = ALL_TYPES.filter((t) => !usedTypes.has(t));

  return (
    <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-[380px_1fr] gap-6">
      {/* Left: editor */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">✏️ Sahifa muharriri</h1>
          <p className="text-xs text-gray-500 mt-1">
            Bloklarni ↑↓ tugmalar bilan ko'chiring, ❌ bilan o'chiring, + bilan qo'shing.
          </p>
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">Sahifa bloklari</div>
          <ul className="space-y-1.5">
            {page.blocks.map((b, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm border rounded px-2 py-1.5 bg-gray-50"
              >
                <span className="flex-1">{BLOCK_LABELS[b.type] ?? b.type}</span>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-1.5 disabled:opacity-30 hover:bg-gray-200 rounded"
                  title="Yuqoriga"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === page.blocks.length - 1}
                  className="px-1.5 disabled:opacity-30 hover:bg-gray-200 rounded"
                  title="Pastga"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(i)}
                  className="px-1.5 hover:bg-red-100 text-red-500 rounded"
                  title="O'chirish"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        {availableTypes.length > 0 && (
          <div className="border rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-gray-600 mb-2">Blok qo'shish</div>
            <div className="flex flex-wrap gap-1.5">
              {availableTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => addBlock(t)}
                  className="px-2 py-1 text-xs border rounded hover:bg-blue-50 hover:border-blue-300"
                >
                  + {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-lg p-3 bg-white space-y-2">
          <div className="text-xs font-semibold text-gray-600">SEO meta</div>
          <input
            type="text"
            placeholder="Page title"
            defaultValue={page.title ?? ""}
            onBlur={(e) => save({ title: e.target.value })}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
          <textarea
            placeholder="Meta description"
            defaultValue={page.meta_description ?? ""}
            onBlur={(e) => save({ meta_description: e.target.value })}
            className="w-full text-sm border rounded px-2 py-1.5"
            rows={3}
          />
        </div>

        <div className="border rounded-lg p-3 bg-white">
          <button
            onClick={() => setShowCss(!showCss)}
            className="text-xs font-semibold text-gray-600 hover:text-blue-600"
          >
            {showCss ? "▼" : "▶"} Custom CSS (Pro)
          </button>
          {showCss && (
            <textarea
              placeholder=".my-class { color: red; }"
              defaultValue={page.custom_css ?? ""}
              onBlur={(e) => save({ custom_css: e.target.value })}
              className="mt-2 w-full text-xs font-mono border rounded p-2"
              rows={8}
            />
          )}
        </div>

        {saving && <div className="text-xs text-blue-500">💾 Saqlanmoqda...</div>}
      </div>

      {/* Right: live preview iframe */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setDevice("desktop")}
            className={`px-3 py-1.5 text-sm rounded ${device === "desktop" ? "bg-blue-500 text-white" : "border"}`}
          >
            🖥 Desktop
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`px-3 py-1.5 text-sm rounded ${device === "mobile" ? "bg-blue-500 text-white" : "border"}`}
          >
            📱 Mobile
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-blue-500 hover:underline"
          >
            Yangi tabda ochish ↗
          </a>
        </div>
        <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ height: 700 }}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className={`bg-white mx-auto block transition-all ${device === "mobile" ? "w-[400px]" : "w-full"}`}
              style={{ height: "100%" }}
              title="Preview"
            />
          ) : (
            <div className="text-center text-gray-500 p-12">Preview yuklanmoqda...</div>
          )}
        </div>
      </div>
    </div>
  );
}
