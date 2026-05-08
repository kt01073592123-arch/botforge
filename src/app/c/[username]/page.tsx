"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

type CartItem = {
  product_id: string; // name + index hash
  service: Service;
  qty: number;
};

const CART_KEY_PREFIX = "bf_cart_";

export default function CustomerWebApp() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<BotData | null>(null);
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Telegram WebApp init
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = (window as any).Telegram?.WebApp;
    w?.ready?.();
    w?.expand?.();
  }, []);

  // Bot ma'lumotini yuklash
  useEffect(() => {
    fetch(`/api/public/${username}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      });
  }, [username]);

  // Cart’ni localStorage’dan yuklash (per bot)
  useEffect(() => {
    if (!username) return;
    try {
      const stored = localStorage.getItem(CART_KEY_PREFIX + username);
      if (stored) setCart(JSON.parse(stored));
    } catch {}
  }, [username]);

  // Cart’ni saqlash
  useEffect(() => {
    if (!username) return;
    try {
      localStorage.setItem(CART_KEY_PREFIX + username, JSON.stringify(cart));
    } catch {}
  }, [cart, username]);

  const filteredServices = useMemo(() => {
    if (!data) return [];
    if (activeCat === "all") return data.services;
    return data.services.filter((s) => s.category_id === activeCat);
  }, [data, activeCat]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, c) => {
      const m = c.service.price.match(/[\d\s,]+/);
      const num = m ? parseInt(m[0].replace(/[\s,]/g, ""), 10) : 0;
      return sum + (isNaN(num) ? 0 : num) * c.qty;
    }, 0);
  }, [cart]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Yuklanmoqda…
      </div>
    );
  }

  const bk = data.brand_kit ?? {};
  const accent = bk.accent_color ?? "#7c5cff";
  const gradient =
    bk.gradient ?? `linear-gradient(135deg, ${bk.primary_color ?? "#7c5cff"} 0%, ${accent} 100%)`;

  const cats = [
    { id: "all" as const, name: "Hammasi" },
    ...data.categories.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  ];

  function addToCart(s: Service, idx: number) {
    if (s.in_stock === false) return;
    const pid = `${s.name}_${idx}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === pid);
      if (existing) {
        return prev.map((c) =>
          c.product_id === pid ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { product_id: pid, service: s, qty: 1 }];
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
  }

  function updateQty(pid: string, delta: number) {
    setCart((prev) => {
      const next = prev
        .map((c) =>
          c.product_id === pid ? { ...c, qty: Math.max(0, c.qty + delta) } : c
        )
        .filter((c) => c.qty > 0);
      return next;
    });
  }

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: bk.background_tint ?? "#0a0c10", color: "#fff" }}
    >
      {/* Hero */}
      <header
        className="px-4 pt-6 pb-5 sticky top-0 z-10"
        style={{ background: gradient, color: bk.text_on_primary ?? "#fff" }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">{data.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{data.business_name}</div>
            <div className="text-xs opacity-90">@{data.bot_username}</div>
          </div>
        </div>
      </header>

      {/* Categories tabs */}
      {data.categories.length > 0 && (
        <div className="sticky top-[80px] z-[5] bg-bg/95 backdrop-blur border-b border-border">
          <div className="overflow-x-auto px-3 py-2">
            <div className="flex gap-1.5 w-max">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition`}
                  style={
                    activeCat === c.id
                      ? { background: accent, color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", color: "#bbb" }
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catalog */}
      <main className="px-3 py-4">
        {filteredServices.length === 0 ? (
          <div className="text-center text-muted py-12 text-sm">
            Bu kategoriyada mahsulot yo‘q
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredServices.map((s, i) => {
              const pid = `${s.name}_${data.services.indexOf(s)}`;
              const inCart = cart.find((c) => c.product_id === pid);
              return (
                <ProductCard
                  key={i}
                  service={s}
                  accent={accent}
                  inCartQty={inCart?.qty ?? 0}
                  onAdd={() => addToCart(s, data.services.indexOf(s))}
                  onUpdate={(delta) => updateQty(pid, delta)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Floating cart bar */}
      {cart.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20 p-3 border-t border-border"
          style={{ background: bk.background_tint ?? "#0a0c10" }}
        >
          <button
            onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: accent, color: "#fff" }}
          >
            <span>
              🛒 Savat ({cart.reduce((s, c) => s + c.qty, 0)})
            </span>
            <span>{cartTotal.toLocaleString("uz-UZ")} so‘m →</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <CartModal
          cart={cart}
          total={cartTotal}
          accent={accent}
          gradient={gradient}
          username={username}
          onClose={() => setShowCart(false)}
          onUpdate={(pid, delta) => updateQty(pid, delta)}
          onClear={() => {
            setCart([]);
            setShowCart(false);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({
  service,
  accent,
  inCartQty,
  onAdd,
  onUpdate,
}: {
  service: Service;
  accent: string;
  inCartQty: number;
  onAdd: () => void;
  onUpdate: (delta: number) => void;
}) {
  const out = service.in_stock === false;
  return (
    <div
      className={`rounded-xl overflow-hidden border border-border ${
        out ? "opacity-50" : ""
      }`}
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {service.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={service.photo_url}
          alt={service.name}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center text-4xl bg-border/30">
          📦
        </div>
      )}
      <div className="p-2.5 space-y-1">
        <div className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.4em]">
          {service.name}
        </div>
        {service.description && (
          <div className="text-[10px] text-muted line-clamp-2">
            {service.description}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-sm font-bold whitespace-nowrap" style={{ color: accent }}>
            {service.price}
          </div>
          {!out &&
            (inCartQty > 0 ? (
              <div
                className="flex items-center gap-1.5 text-sm font-semibold rounded-full px-1"
                style={{ background: accent, color: "#fff" }}
              >
                <button
                  onClick={() => onUpdate(-1)}
                  className="w-7 h-7 flex items-center justify-center"
                >
                  −
                </button>
                <span className="min-w-[1ch] text-center">{inCartQty}</span>
                <button
                  onClick={() => onUpdate(1)}
                  className="w-7 h-7 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={onAdd}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: accent, color: "#fff" }}
              >
                +
              </button>
            ))}
          {out && (
            <div className="text-[10px] text-danger">Yo‘q</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CartModal({
  cart,
  total,
  accent,
  gradient,
  username,
  onClose,
  onUpdate,
  onClear,
}: {
  cart: CartItem[];
  total: number;
  accent: string;
  gradient: string;
  username: string;
  onClose: () => void;
  onUpdate: (pid: string, delta: number) => void;
  onClear: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;

  // Telegram user’dan default ism
  useEffect(() => {
    const u = tg?.initDataUnsafe?.user;
    if (u && !name) {
      setName([u.first_name, u.last_name].filter(Boolean).join(" "));
    }
  }, []);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/public/${username}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_data: tg?.initData ?? "",
          customer_name: name || null,
          customer_phone: phone || null,
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
      if (!res.ok) throw new Error(d.error);
      setDone(true);
      onClear();
      tg?.HapticFeedback?.notificationOccurred?.("success");
      setTimeout(() => {
        onClose();
        tg?.close?.();
      }, 2500);
    } catch (e) {
      setErr((e as Error).message);
      tg?.HapticFeedback?.notificationOccurred?.("error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-black/80">
        <div className="bg-panel rounded-2xl p-6 text-center max-w-sm">
          <div className="text-5xl mb-3">✅</div>
          <div className="font-bold mb-1">Buyurtma yuborildi</div>
          <div className="text-sm text-muted">
            Admin tez orada bog‘lanadi. Ushbu oyna yopiladi.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/80">
      <div className="bg-bg w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sticky top-0 bg-bg border-b border-border flex justify-between items-center">
          <div className="font-bold">Savat</div>
          <button onClick={onClose} className="text-muted text-xl px-2">×</button>
        </div>

        <div className="p-4 space-y-3">
          {cart.map((c) => (
            <div key={c.product_id} className="flex gap-3 items-start">
              {c.service.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.service.photo_url}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-border flex items-center justify-center text-xl flex-shrink-0">
                  📦
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.service.name}</div>
                <div className="text-xs text-muted">{c.service.price}</div>
              </div>
              <div
                className="flex items-center gap-1.5 text-sm font-semibold rounded-full"
                style={{ background: accent, color: "#fff" }}
              >
                <button
                  onClick={() => onUpdate(c.product_id, -1)}
                  className="w-7 h-7 flex items-center justify-center"
                >
                  −
                </button>
                <span className="min-w-[1ch] text-center">{c.qty}</span>
                <button
                  onClick={() => onUpdate(c.product_id, 1)}
                  className="w-7 h-7 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-baseline pt-3 border-t border-border">
            <div className="text-sm text-muted">Jami</div>
            <div className="text-xl font-bold" style={{ color: accent }}>
              {total.toLocaleString("uz-UZ")} so‘m
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <input
              className="input !text-sm"
              placeholder="Ismingiz"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input !text-sm"
              type="tel"
              placeholder="Telefon raqamingiz +998..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <textarea
              className="input !text-sm min-h-[60px]"
              placeholder="Izoh (ixtiyoriy) — manzil, soat, qo‘shimcha so‘rov"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {err && <div className="text-danger text-sm">{err}</div>}

          <button
            onClick={submit}
            disabled={busy || cart.length === 0 || !phone.trim()}
            className="w-full py-3 rounded-2xl font-semibold text-sm"
            style={{ background: gradient, color: "#fff", opacity: busy ? 0.5 : 1 }}
          >
            {busy ? "Yuborilmoqda…" : "✓ Buyurtma berish"}
          </button>
          <div className="text-[11px] text-muted text-center">
            Buyurtma admin’ga Telegram orqali boradi. Tasdiqlash uchun u siz bilan bog‘lanadi.
          </div>
        </div>
      </div>
    </div>
  );
}
