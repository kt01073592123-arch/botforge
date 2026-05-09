"use client";

// Mini App - "kreativ namuna" pattern asosida.
// Sklet: Seoul Beauty Shop (drawer + reviews carousel + product grid + cart),
// lekin dizayn yangicha: aurora mesh background, glassmorphism cards, pill-shape
// review chips, gradient price typography, smooth tab transitions.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BookingSheet from "@/components/BookingSheet";

// ==========================================================================
// TYPES
// ==========================================================================
type Service = {
  name: string;
  price: string;
  duration?: string;
  description?: string;
  photo_url?: string;
  category_id?: string;
  in_stock?: boolean;
};
type Category = { id: string; name: string; position?: number };
type BrandKit = {
  primary_color?: string;
  accent_color?: string;
  background_tint?: string;
  text_on_primary?: string;
  emoji_set?: string[];
  gradient?: string;
};
type BotData = {
  business_name: string;
  description: string | null;
  icon: string;
  bot_username: string;
  deep_link: string;
  brand_kit: BrandKit | null;
  services: Service[];
  categories: Category[];
  contacts: { phone?: string; address?: string; instagram?: string };
};

type CartItem = { product_id: string; service: Service; qty: number };
type Review = {
  id: string;
  rating: number;
  text: string | null;
  customer_name: string | null;
  created_at: string;
};
type ReviewsBundle = { reviews: Review[]; avg_rating: number; count: number };
type Profile = {
  display_name: string | null;
  phone: string | null;
  username: string | null;
  loyalty_points: number;
  total_orders: number;
  total_spent_uzs: number;
};
type Order = {
  id: string;
  items: { name: string; price: string; qty: number }[];
  total_uzs: number;
  status: string;
  note: string | null;
  created_at: string;
  completed_at: string | null;
};
type ReferralInfo = {
  referral_link: string;
  referrals_count: number;
  referrals_completed: number;
  total_bonus_earned_uzs: number;
  bonus_balance_uzs: number;
};

const CART_KEY_PREFIX = "bf_cart_";
const FAV_KEY_PREFIX = "bf_fav_";

type Tab = "home" | "orders" | "favorites" | "profile" | "refer";

// ==========================================================================
// MAIN
// ==========================================================================
export default function CustomerWebApp() {
  const { username } = useParams<{ username: string }>();

  // Core state
  const [data, setData] = useState<BotData | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Catalog
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart + favorites
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [bookingService, setBookingService] = useState<Service | null>(null);

  // Reviews
  const [reviewsBundle, setReviewsBundle] = useState<ReviewsBundle>({
    reviews: [],
    avg_rating: 0,
    count: 0,
  });

  // Customer
  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [tgInitData, setTgInitData] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refInfo, setRefInfo] = useState<ReferralInfo | null>(null);

  // ---- Telegram WebApp init ----
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = (window as any).Telegram?.WebApp;
    w?.ready?.();
    w?.expand?.();
    if (w?.initDataUnsafe?.user?.id) {
      setTgUserId(w.initDataUnsafe.user.id);
      setTgInitData(w.initData ?? "");
    }
  }, []);

  // ---- Bot ma'lumoti ----
  useEffect(() => {
    fetch(`/api/public/${username}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      });
  }, [username]);

  // ---- Reviews ----
  useEffect(() => {
    if (!username) return;
    fetch(`/api/public/${username}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setReviewsBundle(d);
      })
      .catch(() => {});
  }, [username]);

  // ---- Cart + favorites localStorage ----
  useEffect(() => {
    if (!username) return;
    try {
      const c = localStorage.getItem(CART_KEY_PREFIX + username);
      if (c) setCart(JSON.parse(c));
      const f = localStorage.getItem(FAV_KEY_PREFIX + username);
      if (f) setFavorites(JSON.parse(f));
    } catch {}
  }, [username]);
  useEffect(() => {
    if (!username) return;
    try {
      localStorage.setItem(CART_KEY_PREFIX + username, JSON.stringify(cart));
    } catch {}
  }, [cart, username]);
  useEffect(() => {
    if (!username) return;
    try {
      localStorage.setItem(FAV_KEY_PREFIX + username, JSON.stringify(favorites));
    } catch {}
  }, [favorites, username]);

  // ---- Profile/Orders/Refer (lazy-load when tab opens) ----
  useEffect(() => {
    if (!username || !tgUserId) return;
    if (tab === "profile" && !profile) {
      fetch(`/api/public/${username}/profile?tg_id=${tgUserId}&init_data=${encodeURIComponent(tgInitData)}`)
        .then((r) => r.json())
        .then((d) => setProfile(d.profile ?? null))
        .catch(() => {});
    }
    if (tab === "orders" && orders.length === 0) {
      fetch(`/api/public/${username}/orders?tg_id=${tgUserId}&init_data=${encodeURIComponent(tgInitData)}`)
        .then((r) => r.json())
        .then((d) => setOrders(d.orders ?? []))
        .catch(() => {});
    }
    if (tab === "refer" && !refInfo) {
      fetch(`/api/public/${username}/referral?tg_id=${tgUserId}&init_data=${encodeURIComponent(tgInitData)}`)
        .then((r) => r.json())
        .then((d) => setRefInfo(d))
        .catch(() => {});
    }
  }, [tab, username, tgUserId, tgInitData, profile, orders.length, refInfo]);

  // ==========================================================================
  // DERIVED
  // ==========================================================================
  const filteredServices = useMemo(() => {
    if (!data) return [];
    let list = data.services;
    if (activeCat !== "all") list = list.filter((s) => s.category_id === activeCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, activeCat, searchQuery]);

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, c) => {
        const m = c.service.price.match(/[\d\s,]+/);
        const num = m ? parseInt(m[0].replace(/[\s,]/g, ""), 10) : 0;
        return sum + (isNaN(num) ? 0 : num) * c.qty;
      }, 0),
    [cart],
  );

  const favoriteServices = useMemo(() => {
    if (!data) return [];
    return data.services.filter((s, i) => favorites.includes(`${s.name}_${i}`));
  }, [data, favorites]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  function addToCart(s: Service, idx: number) {
    if (s.in_stock === false) return;
    const pid = `${s.name}_${idx}`;
    setCart((prev) => {
      const e = prev.find((c) => c.product_id === pid);
      if (e) return prev.map((c) => (c.product_id === pid ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { product_id: pid, service: s, qty: 1 }];
    });
    haptic("light");
  }
  function updateQty(pid: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.product_id === pid ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    );
  }
  function toggleFav(idx: number, name: string) {
    const pid = `${name}_${idx}`;
    setFavorites((prev) => (prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]));
    haptic("light");
  }

  // ==========================================================================
  // EARLY EXIT
  // ==========================================================================
  if (!data) return <SkeletonShell />;

  const bk = data.brand_kit ?? {};
  const accent = bk.accent_color ?? "#8B5CF6";
  const primary = bk.primary_color ?? "#EC4899";
  const gradient =
    bk.gradient ?? `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;
  const textOnPrimary = bk.text_on_primary ?? "#fff";
  // Light theme: brand tint asosida soft cream/pushti fon, lekin to'q matn.
  // Brand pushtilik aurora va gradient'lar orqali saqlanadi.
  const lightBase = `linear-gradient(180deg, #FFFBFD 0%, #FFF0F5 60%, #FFE4EC 100%)`;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div
      className="min-h-screen pb-28 relative overflow-x-hidden"
      style={{
        background: lightBase,
        color: "#1A1B2E",
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
      }}
    >
      {/* Aurora background — light theme'da juda nozik */}
      <AuroraBgLight primary={primary} accent={accent} />

      {/* Header */}
      <header className="relative px-4 pt-5 pb-4 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-white shadow-sm transition active:scale-95"
            style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
            aria-label="Menu"
          >
            ☰
          </button>

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            style={{
              background: gradient,
              boxShadow: `0 8px 24px ${primary}55`,
            }}
          >
            {data.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-base tracking-tight truncate" style={{ color: "#1A1B2E" }}>
              {data.business_name}
            </div>
            {data.description && (
              <div className="text-[11px] truncate" style={{ color: "#6B6B7B" }}>
                {data.description}
              </div>
            )}
          </div>

          {reviewsBundle.count > 0 && (
            <button
              onClick={() => setTab("home")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
            >
              <span>⭐</span>
              <span>{reviewsBundle.avg_rating.toFixed(1)}</span>
              <span style={{ color: "#9B9BAB" }}>({reviewsBundle.count})</span>
            </button>
          )}
        </div>

        {/* Contact pills */}
        {(data.contacts?.phone || data.contacts?.address) && (
          <div className="flex flex-wrap gap-2">
            {data.contacts?.phone && (
              <a
                href={`tel:${data.contacts.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-sm transition active:scale-95"
                style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
              >
                <span>📞</span>
                <span>{data.contacts.phone}</span>
              </a>
            )}
            {data.contacts?.address && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-sm max-w-[200px]"
                style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
              >
                <span>📍</span>
                <span className="truncate">{data.contacts.address}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Tab content */}
      <div className="relative z-10">
        {tab === "home" && (
          <HomeTab
            data={data}
            services={filteredServices}
            cart={cart}
            favorites={favorites}
            reviewsBundle={reviewsBundle}
            accent={accent}
            primary={primary}
            gradient={gradient}
            activeCat={activeCat}
            setActiveCat={setActiveCat}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onAdd={(s, i) => addToCart(s, data.services.indexOf(s))}
            onUpdateQty={updateQty}
            onBook={(s) => setBookingService(s)}
            onFav={(i, name) => toggleFav(i, name)}
          />
        )}

        {tab === "favorites" && (
          <FavoritesTab
            services={favoriteServices}
            cart={cart}
            accent={accent}
            primary={primary}
            onAdd={(s) => addToCart(s, data.services.indexOf(s))}
            onUpdateQty={updateQty}
            onBook={(s) => setBookingService(s)}
            onFav={(i, name) => toggleFav(i, name)}
            favorites={favorites}
            allServices={data.services}
          />
        )}

        {tab === "orders" && (
          <OrdersTab orders={orders} accent={accent} primary={primary} loaded={tgUserId !== null} />
        )}

        {tab === "profile" && (
          <ProfileTab
            profile={profile}
            username={username}
            tgUserId={tgUserId}
            tgInitData={tgInitData}
            primary={primary}
            accent={accent}
            onSaved={(p) => setProfile(p)}
          />
        )}

        {tab === "refer" && (
          <ReferTab info={refInfo} primary={primary} accent={accent} gradient={gradient} />
        )}
      </div>

      {/* Floating cart */}
      {cart.length > 0 && tab === "home" && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 px-5 py-3 rounded-full font-bold text-sm backdrop-blur-md flex items-center gap-3 shadow-2xl active:scale-95 transition"
          style={{
            background: gradient,
            color: textOnPrimary,
            boxShadow: `0 12px 32px ${primary}66`,
          }}
        >
          <span className="flex items-center gap-1.5">
            <span>🛒</span>
            <span className="bg-white/25 px-2 py-0.5 rounded-full text-[11px]">
              {cart.reduce((s, c) => s + c.qty, 0)}
            </span>
          </span>
          <span className="opacity-30">|</span>
          <span>{cartTotal.toLocaleString("uz-UZ")} so'm</span>
          <span>→</span>
        </button>
      )}

      {/* Bottom navigation */}
      <BottomNav tab={tab} setTab={setTab} cart={cart} primary={primary} accent={accent} />

      {/* Drawer */}
      {drawerOpen && (
        <Drawer
          data={data}
          gradient={gradient}
          primary={primary}
          accent={accent}
          tab={tab}
          setTab={(t) => {
            setTab(t);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Cart modal */}
      {showCart && (
        <CartModal
          cart={cart}
          total={cartTotal}
          username={username}
          tgUserId={tgUserId}
          tgInitData={tgInitData}
          gradient={gradient}
          primary={primary}
          accent={accent}
          onClose={() => setShowCart(false)}
          onUpdate={(pid, delta) => updateQty(pid, delta)}
          onClear={() => {
            setCart([]);
            setShowCart(false);
          }}
        />
      )}

      {/* Booking sheet */}
      {bookingService && (
        <BookingSheet
          username={username}
          service={bookingService}
          accent={accent}
          gradient={gradient}
          onClose={() => setBookingService(null)}
        />
      )}
    </div>
  );
}

// ==========================================================================
// AURORA BACKGROUND - light theme'da nozik blob effekti
// ==========================================================================
function AuroraBgLight({ primary, accent }: { primary: string; accent: string }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: primary, animation: "auroraFloat 20s ease-in-out infinite" }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl"
        style={{ background: accent, animation: "auroraFloat 25s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute bottom-10 left-1/4 w-[360px] h-[360px] rounded-full opacity-15 blur-3xl"
        style={{
          background: `linear-gradient(135deg, ${primary}, ${accent})`,
          animation: "auroraFloat 30s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes auroraFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-30px) scale(1.1); }
          66% { transform: translate(-30px,20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

// ==========================================================================
// HOME TAB
// ==========================================================================
function HomeTab(props: {
  data: BotData;
  services: Service[];
  cart: CartItem[];
  favorites: string[];
  reviewsBundle: ReviewsBundle;
  accent: string;
  primary: string;
  gradient: string;
  activeCat: string | "all";
  setActiveCat: (c: string | "all") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onAdd: (s: Service, i: number) => void;
  onUpdateQty: (pid: string, delta: number) => void;
  onBook: (s: Service) => void;
  onFav: (i: number, name: string) => void;
}) {
  const cats = [
    { id: "all" as const, name: "Hammasi", icon: "✨" },
    ...props.data.categories.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  ];

  return (
    <>
      {/* Search */}
      <div className="px-4 pt-2">
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white shadow-sm"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <span className="text-base" style={{ color: "#9B9BAB" }}>🔍</span>
          <input
            type="text"
            placeholder="Qidirish..."
            value={props.searchQuery}
            onChange={(e) => props.setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            style={{ color: "#1A1B2E" }}
          />
        </div>
      </div>

      {/* Categories */}
      {props.data.categories.length > 0 && (
        <div className="overflow-x-auto px-3 mt-4 scrollbar-hide">
          <div className="flex gap-2 w-max pb-1">
            {cats.map((c) => {
              const active = props.activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => props.setActiveCat(c.id)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition active:scale-95"
                  style={
                    active
                      ? { background: props.gradient, color: "#fff", boxShadow: `0 8px 20px ${props.primary}55` }
                      : { background: "#FFFFFF", color: "#1A1B2E", border: "1px solid rgba(0,0,0,0.06)" }
                  }
                >
                  {"icon" in c && c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews carousel */}
      {props.reviewsBundle.reviews.length > 0 && (
        <div className="mt-5">
          <div className="px-4 mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight" style={{ color: "#1A1B2E" }}>
              Mijozlarimiz fikrlari{" "}
              <span style={{ color: props.primary }}>⭐</span>
            </h3>
            <span className="text-[11px]" style={{ color: "#6B6B7B" }}>
              {props.reviewsBundle.avg_rating.toFixed(1)} / 5
            </span>
          </div>
          <div className="overflow-x-auto px-4 scrollbar-hide">
            <div className="flex gap-2.5 w-max pb-1">
              {props.reviewsBundle.reviews.slice(0, 8).map((r) => (
                <ReviewChip key={r.id} review={r} accent={props.accent} primary={props.primary} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catalog */}
      <main className="px-3 mt-5">
        {props.services.length === 0 ? (
          <EmptyState
            emoji="🛍"
            title="Mahsulot topilmadi"
            subtitle={
              props.searchQuery
                ? `"${props.searchQuery}" bo'yicha mos kelgani yo'q`
                : "Bu kategoriyada hozircha mahsulot yo'q"
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {props.services.map((s) => {
              const idx = props.data.services.indexOf(s);
              const pid = `${s.name}_${idx}`;
              const inCart = props.cart.find((c) => c.product_id === pid);
              const isFav = props.favorites.includes(pid);
              return (
                <ProductCard
                  key={idx}
                  service={s}
                  idx={idx}
                  accent={props.accent}
                  primary={props.primary}
                  gradient={props.gradient}
                  inCartQty={inCart?.qty ?? 0}
                  isFav={isFav}
                  onAdd={() => props.onAdd(s, idx)}
                  onUpdate={(d) => props.onUpdateQty(pid, d)}
                  onBook={() => props.onBook(s)}
                  onFav={() => props.onFav(idx, s.name)}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

// ==========================================================================
// REVIEW CHIP - pill-shaped review card
// ==========================================================================
function ReviewChip({
  review,
  accent,
  primary,
}: {
  review: Review;
  accent: string;
  primary: string;
}) {
  const initial = (review.customer_name ?? "M").charAt(0).toUpperCase();
  return (
    <div
      className="min-w-[200px] max-w-[240px] rounded-2xl p-3 backdrop-blur-md"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${primary}, ${accent})`,
            color: "#fff",
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: "#1A1B2E" }}>
            {review.customer_name ?? "Mijoz"}
          </div>
          <div className="text-[10px]" style={{ color: "#F59E0B" }}>
            {"★".repeat(review.rating)}
            <span style={{ color: "#E5E5EA" }}>{"★".repeat(5 - review.rating)}</span>
          </div>
        </div>
      </div>
      {review.text && (
        <div className="text-[11px] line-clamp-3 leading-relaxed" style={{ color: "#6B6B7B" }}>
          &ldquo;{review.text}&rdquo;
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// PRODUCT CARD - photo + glass overlay + actions
// ==========================================================================
function ProductCard({
  service,
  idx: _idx,
  accent,
  primary,
  gradient,
  inCartQty,
  isFav,
  onAdd,
  onUpdate,
  onBook,
  onFav,
}: {
  service: Service;
  idx: number;
  accent: string;
  primary: string;
  gradient: string;
  inCartQty: number;
  isFav: boolean;
  onAdd: () => void;
  onUpdate: (d: number) => void;
  onBook: () => void;
  onFav: () => void;
}) {
  const out = service.in_stock === false;
  return (
    <div
      className={`group rounded-2xl overflow-hidden relative transition shadow-sm ${
        out ? "opacity-50" : "active:scale-[0.98]"
      }`}
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden">
        {service.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.photo_url}
            alt={service.name}
            className="w-full h-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{
              background: `linear-gradient(135deg, ${primary}22, ${accent}22)`,
            }}
          >
            📦
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFav();
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition active:scale-90"
          style={{
            background: isFav ? "#fff" : "rgba(0,0,0,0.3)",
            color: isFav ? primary : "#fff",
          }}
        >
          {isFav ? "❤️" : "🤍"}
        </button>

        {/* Stock badge */}
        {out && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/80 text-white">
            Yo&apos;q
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        <div className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.4em]" style={{ color: "#1A1B2E" }}>
          {service.name}
        </div>
        {service.description && (
          <div className="text-[10px] line-clamp-1" style={{ color: "#9B9BAB" }}>
            {service.description}
          </div>
        )}
        <div
          className="text-base font-extrabold tracking-tight"
          style={{
            backgroundImage: gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {service.price}
        </div>

        {/* CTA */}
        {!out && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {service.duration ? (
              <button
                onClick={onBook}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition active:scale-95"
                style={{ background: gradient, color: "#fff" }}
              >
                📅 Bron
              </button>
            ) : inCartQty > 0 ? (
              <div
                className="flex-1 flex items-center justify-between rounded-xl text-sm font-bold"
                style={{ background: gradient, color: "#fff" }}
              >
                <button onClick={() => onUpdate(-1)} className="px-3 py-1.5">
                  −
                </button>
                <span className="text-xs">{inCartQty}</span>
                <button onClick={() => onUpdate(1)} className="px-3 py-1.5">
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={onAdd}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition active:scale-95"
                style={{ background: gradient, color: "#fff" }}
              >
                + Savatga
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// FAVORITES TAB
// ==========================================================================
function FavoritesTab(props: {
  services: Service[];
  cart: CartItem[];
  accent: string;
  primary: string;
  onAdd: (s: Service) => void;
  onUpdateQty: (pid: string, delta: number) => void;
  onBook: (s: Service) => void;
  onFav: (i: number, name: string) => void;
  favorites: string[];
  allServices: Service[];
}) {
  if (props.services.length === 0) {
    return (
      <div className="px-4 pt-8">
        <EmptyState
          emoji="💝"
          title="Sevimlilar bo'sh"
          subtitle="Yoqgan mahsulotlarni ❤️ bosib bu yerga qo'shing"
        />
      </div>
    );
  }
  const gradient = `linear-gradient(135deg, ${props.primary}, ${props.accent})`;
  return (
    <main className="px-3 mt-4">
      <div className="grid grid-cols-2 gap-2.5">
        {props.services.map((s) => {
          const idx = props.allServices.indexOf(s);
          const pid = `${s.name}_${idx}`;
          const inCart = props.cart.find((c) => c.product_id === pid);
          return (
            <ProductCard
              key={idx}
              service={s}
              idx={idx}
              accent={props.accent}
              primary={props.primary}
              gradient={gradient}
              inCartQty={inCart?.qty ?? 0}
              isFav={true}
              onAdd={() => props.onAdd(s)}
              onUpdate={(d) => props.onUpdateQty(pid, d)}
              onBook={() => props.onBook(s)}
              onFav={() => props.onFav(idx, s.name)}
            />
          );
        })}
      </div>
    </main>
  );
}

// ==========================================================================
// ORDERS TAB
// ==========================================================================
function OrdersTab({
  orders,
  accent,
  primary,
  loaded,
}: {
  orders: Order[];
  accent: string;
  primary: string;
  loaded: boolean;
}) {
  if (!loaded) {
    return (
      <div className="px-4 pt-8">
        <EmptyState
          emoji="🔒"
          title="Telegram orqali kiring"
          subtitle="Buyurtmalaringizni ko'rish uchun bot orqali Mini App'ni oching"
        />
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="px-4 pt-8">
        <EmptyState
          emoji="📦"
          title="Buyurtmalar yo'q"
          subtitle="Birinchi buyurtmangiz shu yerda ko'rinadi"
        />
      </div>
    );
  }
  return (
    <div className="px-4 mt-4 space-y-2.5">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} accent={accent} primary={primary} />
      ))}
    </div>
  );
}

function OrderCard({
  order,
  accent,
  primary,
}: {
  order: Order;
  accent: string;
  primary: string;
}) {
  const STATUS: Record<string, { label: string; color: string; emoji: string }> = {
    pending: { label: "Kutilmoqda", color: "#FCD34D", emoji: "⏳" },
    confirmed: { label: "Qabul qilindi", color: "#34D399", emoji: "✅" },
    in_progress: { label: "Yo'lda", color: "#60A5FA", emoji: "🚚" },
    completed: { label: "Yetkazildi", color: accent, emoji: "📦" },
    cancelled: { label: "Bekor qilindi", color: "#F87171", emoji: "❌" },
  };
  const st = STATUS[order.status] ?? STATUS.pending;
  const displayId = `ORD-${order.id.slice(-6).toUpperCase()}`;
  const date = new Date(order.created_at);
  return (
    <div
      className="rounded-2xl p-3.5 bg-white shadow-sm"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[11px] font-semibold" style={{ color: "#6B6B7B" }}>{displayId}</div>
          <div className="text-[10px]" style={{ color: "#9B9BAB" }}>
            {date.toLocaleDateString("uz-UZ")} · {date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"
          style={{ background: `${st.color}25`, color: st.color }}
        >
          <span>{st.emoji}</span>
          <span>{st.label}</span>
        </div>
      </div>
      <div className="space-y-0.5 mb-2">
        {order.items.slice(0, 3).map((it, i) => (
          <div key={i} className="text-xs flex justify-between gap-2" style={{ color: "#1A1B2E" }}>
            <span className="truncate">
              • {it.name} × {it.qty}
            </span>
            <span className="whitespace-nowrap">{it.price}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="text-[10px]" style={{ color: "#9B9BAB" }}>
            ... va yana {order.items.length - 3} ta
          </div>
        )}
      </div>
      <div
        className="text-base font-extrabold tracking-tight"
        style={{
          backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {order.total_uzs.toLocaleString("uz-UZ")} so&apos;m
      </div>
    </div>
  );
}

// ==========================================================================
// PROFILE TAB
// ==========================================================================
function ProfileTab({
  profile,
  username,
  tgUserId,
  tgInitData,
  primary,
  accent,
  onSaved,
}: {
  profile: Profile | null;
  username: string;
  tgUserId: number | null;
  tgInitData: string;
  primary: string;
  accent: string;
  onSaved: (p: Profile) => void;
}) {
  const [name, setName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  if (!tgUserId) {
    return (
      <div className="px-4 pt-8">
        <EmptyState
          emoji="🔒"
          title="Telegram orqali kiring"
          subtitle="Profil saqlash uchun bot orqali Mini App'ni oching"
        />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/public/${username}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_data: tgInitData,
          tg_id: tgUserId,
          display_name: name || undefined,
          phone: phone || undefined,
        }),
      });
      setSaved(true);
      onSaved({
        display_name: name,
        phone,
        username: profile?.username ?? null,
        loyalty_points: profile?.loyalty_points ?? 0,
        total_orders: profile?.total_orders ?? 0,
        total_spent_uzs: profile?.total_spent_uzs ?? 0,
      });
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const gradient = `linear-gradient(135deg, ${primary}, ${accent})`;
  return (
    <div className="px-4 mt-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Buyurtmalar" value={String(profile?.total_orders ?? 0)} primary={primary} />
        <StatCard label="Sarflandi" value={`${((profile?.total_spent_uzs ?? 0) / 1000).toFixed(0)}k`} primary={primary} />
        <StatCard label="Bonus" value={String(profile?.loyalty_points ?? 0)} primary={primary} />
      </div>

      {/* Form */}
      <div
        className="rounded-2xl p-4 space-y-3 bg-white shadow-sm"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Field
          label="Ism"
          value={name}
          onChange={setName}
          placeholder="Ismingiz"
          icon="👤"
        />
        <Field
          label="Telefon"
          value={phone}
          onChange={setPhone}
          placeholder="+998 90 ..."
          icon="📞"
          type="tel"
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 shadow-md"
          style={{ background: gradient, color: "#fff", boxShadow: `0 8px 20px ${primary}55` }}
        >
          {saving ? "Saqlanmoqda..." : saved ? "✓ Saqlandi" : "💾 Saqlash"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, primary }: { label: string; value: string; primary: string }) {
  return (
    <div
      className="rounded-2xl p-3 text-center bg-white shadow-sm"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="text-xl font-extrabold tracking-tight" style={{ color: primary }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: "#6B6B7B" }}>{label}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: string;
  type?: string;
}) {
  return (
    <div>
      <div className="text-[11px] mb-1 ml-1 font-medium" style={{ color: "#6B6B7B" }}>{label}</div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: "#FAFAFC", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {icon && <span className="text-sm" style={{ color: "#9B9BAB" }}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#1A1B2E" }}
        />
      </div>
    </div>
  );
}

// ==========================================================================
// REFER TAB
// ==========================================================================
function ReferTab({
  info,
  primary,
  accent,
  gradient,
}: {
  info: ReferralInfo | null;
  primary: string;
  accent: string;
  gradient: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!info) {
    return (
      <div className="px-4 pt-8">
        <EmptyState
          emoji="🔒"
          title="Telegram orqali kiring"
          subtitle="Do'stni taklif qilish uchun bot orqali Mini App'ni oching"
        />
      </div>
    );
  }

  function copyLink() {
    navigator.clipboard?.writeText(info!.referral_link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-4 mt-4 space-y-4">
      {/* Hero card */}
      <div
        className="rounded-3xl p-5 text-center"
        style={{ background: gradient, color: "#fff" }}
      >
        <div className="text-5xl mb-2">🎁</div>
        <div className="font-extrabold text-lg mb-1">Do&apos;stni taklif qiling</div>
        <div className="text-xs opacity-90 max-w-[260px] mx-auto leading-relaxed">
          Do&apos;stingiz birinchi xaridini qilganda{" "}
          <span className="font-bold">2% keshbek</span> sizga qaytadi
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Taklif qilindi"
          value={`${info.referrals_completed}/${info.referrals_count}`}
          primary={primary}
        />
        <StatCard
          label="Bonus to'plandi"
          value={`${(info.bonus_balance_uzs / 1000).toFixed(0)}k`}
          primary={primary}
        />
      </div>

      {/* Link */}
      <div
        className="rounded-2xl p-4 space-y-2.5 bg-white shadow-sm"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="text-[11px] font-medium" style={{ color: "#6B6B7B" }}>Sizning havola</div>
        <div
          className="text-xs font-mono truncate p-2 rounded-lg"
          style={{ background: "#FAFAFC", border: "1px solid rgba(0,0,0,0.08)", color: "#1A1B2E" }}
        >
          {info.referral_link}
        </div>
        <button
          onClick={copyLink}
          className="w-full py-2.5 rounded-xl font-bold text-sm transition active:scale-95 shadow-md"
          style={{ background: gradient, color: "#fff", boxShadow: `0 8px 20px ${primary}55` }}
        >
          {copied ? "✓ Nusxalandi" : "🔗 Havolani nusxa olish"}
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// BOTTOM NAV - pill-shape navigation
// ==========================================================================
function BottomNav({
  tab,
  setTab,
  cart,
  primary,
  accent,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  cart: CartItem[];
  primary: string;
  accent: string;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "🏠", label: "Bosh" },
    { id: "favorites", icon: "❤️", label: "Sevimli" },
    { id: "orders", icon: "📦", label: "Buyurtma" },
    { id: "refer", icon: "🎁", label: "Taklif" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-2"
      style={{
        background:
          "linear-gradient(to top, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0))",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="flex items-center justify-between rounded-3xl px-1 py-1 bg-white shadow-lg"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        {items.map((it) => {
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl transition"
              style={
                active
                  ? {
                      background: `linear-gradient(135deg, ${primary}, ${accent})`,
                      color: "#fff",
                      boxShadow: `0 6px 14px ${primary}55`,
                    }
                  : { color: "#6B6B7B" }
              }
            >
              <span className="text-lg">{it.icon}</span>
              <span className="text-[9px] font-semibold">{it.label}</span>
              {it.id === "favorites" && cartCount > 0 && false && null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ==========================================================================
// DRAWER - slides in from left with backdrop
// ==========================================================================
function Drawer({
  data,
  gradient,
  primary,
  accent,
  tab,
  setTab,
  onClose,
}: {
  data: BotData;
  gradient: string;
  primary: string;
  accent: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  onClose: () => void;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "🏠", label: "Bosh sahifa" },
    { id: "favorites", icon: "❤️", label: "Sevimlilar" },
    { id: "orders", icon: "📦", label: "Buyurtmalarim" },
    { id: "refer", icon: "🎁", label: "Do'stni taklif" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];
  return (
    <div className="fixed inset-0 z-40">
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="absolute left-0 top-0 bottom-0 w-[78%] max-w-[320px] p-4 overflow-y-auto bg-white"
        style={{ borderRight: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
            style={{ background: gradient }}
          >
            {data.icon}
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-base">{data.business_name}</div>
            <div className="text-[10px]" style={{ color: "#9B9BAB" }}>@{data.bot_username}</div>
          </div>
        </div>

        {/* Nav */}
        <div className="space-y-1">
          {items.map((it) => {
            const active = tab === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
                style={
                  active
                    ? { background: gradient, color: "#fff", boxShadow: `0 4px 12px ${primary}40` }
                    : { background: "transparent", color: "#1A1B2E" }
                }
              >
                <span className="text-lg">{it.icon}</span>
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contacts */}
        {(data.contacts?.phone || data.contacts?.address || data.contacts?.instagram) && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="text-[10px] uppercase tracking-wider mb-2 px-1 font-semibold" style={{ color: "#9B9BAB" }}>
              Aloqa
            </div>
            <div className="space-y-1">
              {data.contacts?.phone && (
                <a
                  href={`tel:${data.contacts.phone}`}
                  className="block px-3 py-2 rounded-lg text-xs"
                  style={{ color: "#1A1B2E" }}
                >
                  📞 {data.contacts.phone}
                </a>
              )}
              {data.contacts?.address && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ color: "#6B6B7B" }}>
                  📍 {data.contacts.address}
                </div>
              )}
              {data.contacts?.instagram && (
                <a
                  href={`https://instagram.com/${data.contacts.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener"
                  className="block px-3 py-2 rounded-lg text-xs"
                  style={{ color: "#1A1B2E" }}
                >
                  📷 {data.contacts.instagram}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Powered by */}
        <div className="absolute bottom-4 left-4 right-4 text-center text-[9px]" style={{ color: "#C5C5D2" }}>
          Powered by BotForge
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// CART MODAL - bottom-sheet style with order submit
// ==========================================================================
function CartModal({
  cart,
  total,
  username,
  tgUserId,
  tgInitData,
  gradient,
  primary,
  accent,
  onClose,
  onUpdate,
  onClear,
}: {
  cart: CartItem[];
  total: number;
  username: string;
  tgUserId: number | null;
  tgInitData: string;
  gradient: string;
  primary: string;
  accent: string;
  onClose: () => void;
  onUpdate: (pid: string, delta: number) => void;
  onClear: () => void;
}) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!phone) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/${username}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_data: tgInitData,
          customer_name: name || null,
          customer_phone: phone,
          note: note || null,
          items: cart.map((c) => ({
            name: c.service.name,
            price: c.service.price,
            qty: c.qty,
          })),
          total_uzs: total,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setDone(true);
        setTimeout(() => {
          onClear();
          onClose();
        }, 1800);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      />
      <div
        className="relative w-full max-h-[88vh] rounded-t-3xl overflow-y-auto bg-white"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)", color: "#1A1B2E" }}
      >
        {/* Drag handle */}
        <div className="sticky top-0 pt-3 pb-2 flex justify-center bg-white">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.15)" }} />
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-3">✅</div>
            <div className="font-bold text-lg">Buyurtma qabul qilindi!</div>
            <div className="text-xs mt-1" style={{ color: "#6B6B7B" }}>Tez orada admin bog&apos;lanadi</div>
          </div>
        ) : step === "cart" ? (
          <>
            <div className="px-4 py-2 flex items-center justify-between">
              <h2 className="font-extrabold text-lg">🛒 Savat</h2>
              <button onClick={onClear} className="text-[11px]" style={{ color: "#6B6B7B" }}>
                Tozalash
              </button>
            </div>
            <div className="px-4 space-y-2">
              {cart.map((c) => (
                <div
                  key={c.product_id}
                  className="flex items-center gap-2.5 p-2 rounded-xl"
                  style={{ background: "#FAFAFC", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {c.service.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.service.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xl"
                        style={{ background: `linear-gradient(135deg, ${primary}33, ${accent}33)` }}
                      >
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{c.service.name}</div>
                    <div className="text-[11px]" style={{ color: "#6B6B7B" }}>{c.service.price}</div>
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full px-1"
                    style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)" }}
                  >
                    <button onClick={() => onUpdate(c.product_id, -1)} className="w-7 h-7">
                      −
                    </button>
                    <span className="text-xs font-bold min-w-[1ch] text-center">{c.qty}</span>
                    <button onClick={() => onUpdate(c.product_id, 1)} className="w-7 h-7">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 sticky bottom-0 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#6B6B7B" }}>Jami:</span>
                <span
                  className="text-xl font-extrabold"
                  style={{
                    backgroundImage: gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {total.toLocaleString("uz-UZ")} so&apos;m
                </span>
              </div>
              <button
                onClick={() => setStep("checkout")}
                className="w-full py-3 rounded-2xl font-bold text-sm transition active:scale-95"
                style={{ background: gradient, color: "#fff", boxShadow: `0 8px 24px ${primary}55` }}
              >
                Buyurtma berish →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-2 flex items-center gap-3">
              <button onClick={() => setStep("cart")}>←</button>
              <h2 className="font-extrabold text-lg">📦 Buyurtma</h2>
            </div>
            <div className="px-4 space-y-2.5 pb-4">
              <Field
                label="Ism"
                value={name}
                onChange={setName}
                placeholder="Ismingiz (ixtiyoriy)"
                icon="👤"
              />
              <Field
                label="Telefon *"
                value={phone}
                onChange={setPhone}
                placeholder="+998 90 ..."
                icon="📞"
                type="tel"
              />
              <div>
                <div className="text-[11px] mb-1 ml-1 font-medium" style={{ color: "#6B6B7B" }}>Izoh</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Yetkazib berish manzili, qo'shimcha ma'lumot..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none placeholder:text-gray-400"
                  style={{ background: "#FAFAFC", border: "1px solid rgba(0,0,0,0.08)", color: "#1A1B2E" }}
                />
              </div>
              <div
                className="rounded-xl p-3 mt-3"
                style={{ background: "#FAFAFC", border: "1px solid rgba(0,0,0,0.08)" }}
              >
                <div className="text-[11px] mb-1 font-medium" style={{ color: "#6B6B7B" }}>Buyurtma:</div>
                <div className="text-xs space-y-0.5">
                  {cart.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="truncate" style={{ color: "#1A1B2E" }}>
                        {c.service.name} × {c.qty}
                      </span>
                      <span style={{ color: "#1A1B2E" }}>{c.service.price}</span>
                    </div>
                  ))}
                  {cart.length > 4 && (
                    <div className="text-[10px]" style={{ color: "#9B9BAB" }}>
                      ... va yana {cart.length - 4} ta
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                  <span className="text-xs font-bold">Jami:</span>
                  <span
                    className="font-extrabold"
                    style={{
                      backgroundImage: gradient,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {total.toLocaleString("uz-UZ")} so&apos;m
                  </span>
                </div>
              </div>
              <button
                onClick={submit}
                disabled={submitting || !phone}
                className="w-full py-3 rounded-2xl font-bold text-sm transition active:scale-95 disabled:opacity-50"
                style={{ background: gradient, color: "#fff" }}
              >
                {submitting ? "Yuborilmoqda..." : "✅ Tasdiqlash"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// EMPTY STATE + SKELETON + HAPTIC
// ==========================================================================
function EmptyState({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3 opacity-60">{emoji}</div>
      <div className="font-bold text-sm" style={{ color: "#1A1B2E" }}>{title}</div>
      {subtitle && (
        <div className="text-xs mt-1 max-w-[280px] mx-auto" style={{ color: "#6B6B7B" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SkeletonShell() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#FFFBFD", color: "#9B9BAB" }}>
      <div className="w-16 h-16 rounded-3xl animate-pulse mb-3" style={{ background: "rgba(0,0,0,0.05)" }} />
      <div className="text-xs">Yuklanmoqda...</div>
    </div>
  );
}

function haptic(style: "light" | "medium" | "heavy" = "light") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
}
