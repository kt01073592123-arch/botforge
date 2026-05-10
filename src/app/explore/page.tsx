"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ExploreItem = {
  id: string;
  business_name: string;
  description: string | null;
  tg_username: string;
  icon: string;
  category: string | null;
  vertical: string | null;
  brand_kit: { primary_color?: string; accent_color?: string; gradient?: string } | null;
  total_reviews: number;
  avg_rating: number;
};

const CATEGORY_LABELS: Record<string, { name: string; emoji: string }> = {
  shop: { name: "Do'kon", emoji: "🛒" },
  salon: { name: "Salon", emoji: "💇" },
  restaurant: { name: "Restoran", emoji: "🍽" },
  service: { name: "Xizmat", emoji: "🔧" },
  course: { name: "Ta'lim", emoji: "📚" },
  clinic: { name: "Klinika", emoji: "🩺" },
  fitness: { name: "Fitnes", emoji: "💪" },
  other: { name: "Boshqa", emoji: "📦" },
};

export default function ExplorePage() {
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCat]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeCat) params.set("category", activeCat);
    const r = await fetch(`/api/explore?${params}`).then((r) => r.json());
    setItems(r.items ?? []);
    setCategories(r.categories ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #FFFBFD 0%, #FFF0F5 100%)" }}>
      {/* Hero */}
      <header className="px-4 pt-8 pb-6 text-center max-w-3xl mx-auto">
        <Link href="/" className="text-2xl font-extrabold tracking-tight" style={{ color: "#1A1B2E" }}>
          🤖 BotForge
        </Link>
        <h1 className="text-3xl font-extrabold mt-4 mb-2" style={{ color: "#1A1B2E" }}>
          Botlar galereyasi
        </h1>
        <p className="text-sm" style={{ color: "#6B6B7B" }}>
          Toshkentlik biznes botlarini kashf qiling. Buyurtma bering, mahsulot
          ko&apos;ring yoki o&apos;zingiz ham yarating.
        </p>
      </header>

      {/* Search */}
      <div className="max-w-3xl mx-auto px-4 mb-4">
        <input
          type="text"
          placeholder="Qidirish (nom, biznes turi)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white shadow-sm outline-none text-sm"
          style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
        />
      </div>

      {/* Categories */}
      <div className="max-w-3xl mx-auto px-4 mb-4 overflow-x-auto">
        <div className="flex gap-2 w-max pb-1">
          <CatChip
            label="Hammasi"
            active={!activeCat}
            onClick={() => setActiveCat(null)}
          />
          {categories.map((c) => {
            const meta = CATEGORY_LABELS[c.category] ?? { name: c.category, emoji: "📦" };
            return (
              <CatChip
                key={c.category}
                label={`${meta.emoji} ${meta.name} (${c.count})`}
                active={activeCat === c.category}
                onClick={() => setActiveCat(c.category)}
              />
            );
          })}
        </div>
      </div>

      {/* Bots grid */}
      <main className="max-w-3xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: "#9B9BAB" }}>
            Yuklanmoqda…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-2 opacity-60">🤷</div>
            <div className="text-sm" style={{ color: "#6B6B7B" }}>
              {search || activeCat ? "Hech narsa topilmadi" : "Hali bot yo'q"}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((b) => (
              <BotCard key={b.id} bot={b} />
            ))}
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <footer
        className="text-center pb-8 px-4 pt-6 max-w-3xl mx-auto"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="text-sm font-bold mb-1" style={{ color: "#1A1B2E" }}>
          O&apos;zingiz ham bot yarating
        </div>
        <div className="text-xs mb-3" style={{ color: "#6B6B7B" }}>
          Telegram orqali AI manager — 5 daqiqada
        </div>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-full font-bold text-sm text-white"
          style={{
            background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
            boxShadow: "0 8px 20px rgba(236,72,153,0.35)",
          }}
        >
          🚀 Bot yaratish
        </Link>
      </footer>
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95"
      style={
        active
          ? {
              background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(236,72,153,0.3)",
            }
          : {
              background: "#fff",
              color: "#1A1B2E",
              border: "1px solid rgba(0,0,0,0.06)",
            }
      }
    >
      {label}
    </button>
  );
}

function BotCard({ bot }: { bot: ExploreItem }) {
  const gradient =
    bot.brand_kit?.gradient ??
    `linear-gradient(135deg, ${bot.brand_kit?.primary_color ?? "#EC4899"}, ${bot.brand_kit?.accent_color ?? "#8B5CF6"})`;
  const catKey = bot.category ?? bot.vertical ?? "other";
  const catMeta = CATEGORY_LABELS[catKey] ?? { name: catKey, emoji: "📦" };
  return (
    <Link
      href={`/b/${bot.tg_username}`}
      className="block bg-white rounded-2xl overflow-hidden shadow-sm transition active:scale-[0.98]"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div
        className="h-24 flex items-center justify-center text-5xl"
        style={{ background: gradient }}
      >
        {bot.icon}
      </div>
      <div className="p-3">
        <div className="font-bold text-sm leading-tight line-clamp-2 mb-1" style={{ color: "#1A1B2E" }}>
          {bot.business_name}
        </div>
        {bot.description && (
          <div className="text-[10px] line-clamp-2 mb-2" style={{ color: "#9B9BAB" }}>
            {bot.description}
          </div>
        )}
        <div className="flex items-center justify-between gap-1">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "#FAFAFC", color: "#6B6B7B" }}
          >
            {catMeta.emoji} {catMeta.name}
          </span>
          {bot.total_reviews > 0 && (
            <span className="text-[10px]" style={{ color: "#F59E0B" }}>
              ⭐ {bot.avg_rating.toFixed(1)} ({bot.total_reviews})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
