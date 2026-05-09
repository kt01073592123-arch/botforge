"use client";

// BeautyShop'dan moslashtirilgan to'liq shop logic.
// Tabs: home, cart, orders, profile, about
// Cart localStorage'da saqlanadi.
// Checkout → /api/public/[username]/order endpoint orqali Telegram'ga yuboriladi.

import { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  photo_url: string | null;
  price: number;
  price_label: string;
  category_id: string | null;
  in_stock: boolean;
  duration: string | null;
};

type Category = { id: string; name: string };

type Contacts = { phone?: string; address?: string; instagram?: string };

type CartItem = { product: Product; qty: number };

type Order = {
  id: string;
  total_uzs: number;
  status: string;
  items: Array<{ name: string; qty: number; price: number }>;
  created_at: string;
};

type Tab = "home" | "cart" | "orders" | "profile" | "about";

type Props = {
  botId: string;
  botUsername: string;
  businessName: string;
  tagline: string;
  aboutText: string;
  logoEmoji: string;
  contacts: Contacts;
  workingHours: Record<string, [number, number] | null>;
  faq: Array<{ q: string; a: string }>;
  products: Product[];
  categories: Category[];
};

export default function ShopClient(props: Props) {
  const cartKey = `bf_shop_cart_${props.botUsername}`;
  const profileKey = `bf_shop_profile_${props.botUsername}`;
  const ordersKey = `bf_shop_orders_${props.botUsername}`;

  const [tab, setTab] = useState<Tab>("home");
  const [drawer, setDrawer] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", phone: "", address: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const isClient = useRef(false);

  // ── Init from localStorage
  useEffect(() => {
    isClient.current = true;
    try {
      const c = localStorage.getItem(cartKey);
      if (c) setCart(JSON.parse(c));
      const p = localStorage.getItem(profileKey);
      if (p) setProfile({ fullName: "", phone: "", address: "", ...JSON.parse(p) });
      const fav = localStorage.getItem(`${cartKey}_fav`);
      if (fav) setFavorites(JSON.parse(fav));
      const o = localStorage.getItem(ordersKey);
      if (o) setOrders(JSON.parse(o));
    } catch {}
  }, [cartKey, profileKey, ordersKey]);

  // ── Persist
  useEffect(() => {
    if (isClient.current) localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);
  useEffect(() => {
    if (isClient.current) localStorage.setItem(profileKey, JSON.stringify(profile));
  }, [profile, profileKey]);
  useEffect(() => {
    if (isClient.current) localStorage.setItem(`${cartKey}_fav`, JSON.stringify(favorites));
  }, [favorites, cartKey]);

  // ── Filtering
  const allCategories = useMemo<Category[]>(() => {
    const set = new Set<string>();
    for (const p of props.products) if (p.category_id) set.add(p.category_id);
    const named: Category[] = props.categories.filter((c) => set.has(c.id));
    return [{ id: "all", name: "Hammasi" }, ...named];
  }, [props.categories, props.products]);

  const visibleProducts = useMemo(() => {
    let list = props.products;
    if (activeCat !== "all") list = list.filter((p) => p.category_id === activeCat);
    if (showFavOnly) list = list.filter((p) => favorites[p.id]);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [props.products, activeCat, showFavOnly, search, favorites]);

  // ── Cart helpers
  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  function addToCart(p: Product, delta = 1) {
    setCart((prev) => {
      const found = prev.find((c) => c.product.id === p.id);
      if (!found) {
        if (delta < 0) return prev;
        return [...prev, { product: p, qty: 1 }];
      }
      const newQty = found.qty + delta;
      if (newQty <= 0) return prev.filter((c) => c.product.id !== p.id);
      return prev.map((c) => (c.product.id === p.id ? { ...c, qty: newQty } : c));
    });
    showToast(delta > 0 ? "Savatga qo'shildi" : "O'chirildi");
  }

  function removeFromCart(p: Product) {
    setCart((prev) => prev.filter((c) => c.product.id !== p.id));
  }

  function clearCart() {
    setCart([]);
  }

  function toggleFav(productId: string) {
    setFavorites((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  // ── Checkout
  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!profile.fullName.trim() || !profile.phone.trim() || !profile.address.trim()) {
      showToast("To'liq ma'lumot kiriting");
      return;
    }
    setSubmitting(true);
    try {
      // Endpoint price'ni string sifatida kutadi (eski WebApp bilan moslik)
      const items = cart.map((c) => ({
        name: c.product.name,
        qty: c.qty,
        price: c.product.price > 0 ? String(c.product.price) : c.product.price_label,
      }));
      const itemsForLocal = cart.map((c) => ({
        name: c.product.name,
        qty: c.qty,
        price: c.product.price,
      }));
      const note = `Mijoz: ${profile.fullName}\nManzil: ${profile.address}`;
      const res = await fetch(`/api/public/${props.botUsername}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer_name: profile.fullName,
          customer_phone: profile.phone,
          note,
          total_uzs: cartTotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message ?? "Xato — qayta urining");
        return;
      }
      const newOrder: Order = {
        id: data.order_id ?? `local-${Date.now()}`,
        total_uzs: cartTotal,
        status: "pending",
        items: itemsForLocal,
        created_at: new Date().toISOString(),
      };
      const updated = [newOrder, ...orders].slice(0, 30);
      setOrders(updated);
      localStorage.setItem(ordersKey, JSON.stringify(updated));
      clearCart();
      setCheckoutOpen(false);
      setTab("orders");
      showToast("✅ Buyurtma yuborildi!");
    } catch (e) {
      showToast(`Xato: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render
  return (
    <>
      {/* HEADER */}
      <header className="main-brand-header">
        <div className="mbh-top">
          <button className="hamburger" onClick={() => setDrawer(true)} aria-label="Menu">
            ☰
          </button>
          <div className="mbh-logo">{props.logoEmoji}</div>
          <div className="mbh-texts">
            <h1>{props.businessName}</h1>
            {props.tagline && <p>{props.tagline}</p>}
          </div>
        </div>
        {(props.contacts.phone || props.contacts.address) && (
          <div className="mbh-bottom">
            {props.contacts.phone && (
              <a href={`tel:${props.contacts.phone}`} className="mbh-pill">
                <span>📞</span> {props.contacts.phone}
              </a>
            )}
            {props.contacts.address && (
              <span className="mbh-pill">
                <span>📍</span> {props.contacts.address}
              </span>
            )}
          </div>
        )}
      </header>

      {/* DRAWER */}
      <div className={`drawer-overlay ${drawer ? "open" : ""}`} onClick={() => setDrawer(false)} />
      <aside className={`drawer-content ${drawer ? "open" : ""}`}>
        <div className="drawer-header">
          <button className="d-icon-btn" onClick={() => setDrawer(false)}>
            ←
          </button>
          <h2>{props.businessName}</h2>
        </div>
        <div className="d-label">Asosiy</div>
        <div
          className={`d-item ${tab === "home" && !showFavOnly ? "active" : ""}`}
          onClick={() => {
            setTab("home");
            setShowFavOnly(false);
            setActiveCat("all");
            setDrawer(false);
          }}
        >
          🏠 Bosh sahifa
        </div>
        <div
          className={`d-item ${tab === "home" && showFavOnly ? "active" : ""}`}
          onClick={() => {
            setTab("home");
            setShowFavOnly(true);
            setDrawer(false);
          }}
        >
          ❤️ Sevimlilar
        </div>
        <div
          className={`d-item ${tab === "cart" ? "active" : ""}`}
          onClick={() => {
            setTab("cart");
            setDrawer(false);
          }}
        >
          🛒 Savat ({cartCount})
        </div>
        <div
          className={`d-item ${tab === "orders" ? "active" : ""}`}
          onClick={() => {
            setTab("orders");
            setDrawer(false);
          }}
        >
          📋 Buyurtmalarim
        </div>
        {allCategories.length > 1 && <div className="d-label">Kategoriyalar</div>}
        {allCategories.length > 1 &&
          allCategories.map((c) => (
            <div
              key={c.id}
              className={`d-item ${tab === "home" && activeCat === c.id && !showFavOnly ? "active" : ""}`}
              onClick={() => {
                setTab("home");
                setActiveCat(c.id);
                setShowFavOnly(false);
                setDrawer(false);
              }}
            >
              ≡ {c.name}
            </div>
          ))}
        <div className="d-label">Boshqa</div>
        <div
          className={`d-item ${tab === "profile" ? "active" : ""}`}
          onClick={() => {
            setTab("profile");
            setDrawer(false);
          }}
        >
          👤 Profil
        </div>
        <div
          className={`d-item ${tab === "about" ? "active" : ""}`}
          onClick={() => {
            setTab("about");
            setDrawer(false);
          }}
        >
          ℹ️ Do'kon haqida
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main>
        {tab === "home" && (
          <HomeView
            search={search}
            setSearch={setSearch}
            categories={allCategories}
            activeCat={activeCat}
            setActiveCat={setActiveCat}
            products={visibleProducts}
            cart={cart}
            addToCart={addToCart}
            favorites={favorites}
            toggleFav={toggleFav}
            setSelectedProduct={setSelectedProduct}
            showFavOnly={showFavOnly}
          />
        )}
        {tab === "cart" && (
          <CartView
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            cartTotal={cartTotal}
            onCheckout={() => setCheckoutOpen(true)}
          />
        )}
        {tab === "orders" && <OrdersView orders={orders} />}
        {tab === "profile" && <ProfileView profile={profile} setProfile={setProfile} />}
        {tab === "about" && (
          <AboutView
            businessName={props.businessName}
            aboutText={props.aboutText}
            contacts={props.contacts}
            workingHours={props.workingHours}
            faq={props.faq}
          />
        )}
      </main>

      {/* FLOATING CART BAR (home/products) */}
      {tab === "home" && cartCount > 0 && (
        <div className="cart-floating" onClick={() => setTab("cart")}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Savat ({cartCount})</div>
            <div className="cart-floating-text">{cartTotal.toLocaleString("uz-UZ")} so'm</div>
          </div>
          <div className="cart-floating-arrow">Ko'rish →</div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <button className={`bn-item ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")}>
          <span className="bn-icon">🏠</span>
          <span>Bosh</span>
        </button>
        <button className={`bn-item ${tab === "cart" ? "active" : ""}`} onClick={() => setTab("cart")}>
          <span className="bn-icon">🛒</span>
          {cartCount > 0 && <span className="bn-badge">{cartCount}</span>}
          <span>Savat</span>
        </button>
        <button className={`bn-item ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
          <span className="bn-icon">📋</span>
          <span>Buyurtmalar</span>
        </button>
        <button className={`bn-item ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
          <span className="bn-icon">👤</span>
          <span>Profil</span>
        </button>
      </nav>

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          cart={cart}
          favorites={favorites}
          toggleFav={toggleFav}
          addToCart={addToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* CHECKOUT MODAL */}
      {checkoutOpen && (
        <CheckoutModal
          profile={profile}
          setProfile={setProfile}
          onSubmit={submitOrder}
          onClose={() => setCheckoutOpen(false)}
          total={cartTotal}
          submitting={submitting}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "10px 18px",
            borderRadius: 12,
            zIndex: 500,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════
function HomeView({
  search,
  setSearch,
  categories,
  activeCat,
  setActiveCat,
  products,
  cart,
  addToCart,
  favorites,
  toggleFav,
  setSelectedProduct,
  showFavOnly,
}: {
  search: string;
  setSearch: (s: string) => void;
  categories: Category[];
  activeCat: string;
  setActiveCat: (s: string) => void;
  products: Product[];
  cart: CartItem[];
  addToCart: (p: Product, delta?: number) => void;
  favorites: Record<string, boolean>;
  toggleFav: (id: string) => void;
  setSelectedProduct: (p: Product) => void;
  showFavOnly: boolean;
}) {
  return (
    <>
      <div className="filter-section">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {categories.length > 1 && (
        <div className="cat-chips">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat-chip ${activeCat === c.id ? "active" : ""}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {showFavOnly && (
        <div className="announcement">❤️ Faqat sevimlilar ko'rsatilmoqda</div>
      )}

      <div className="product-grid">
        {products.map((p) => {
          const inCart = cart.find((c) => c.product.id === p.id);
          const liked = !!favorites[p.id];
          return (
            <div key={p.id} className="product-card" onClick={() => setSelectedProduct(p)}>
              <button
                className="like-btn-corner"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(p.id);
                }}
              >
                {liked ? "❤️" : "🤍"}
              </button>
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo_url} alt={p.name} className="product-image" />
              ) : (
                <div className="product-image-placeholder">📦</div>
              )}
              <div className="product-title">{p.name}</div>
              {p.description && <div className="product-desc">{p.description}</div>}
              <div className="product-price">
                {p.price > 0
                  ? `${p.price.toLocaleString("uz-UZ")} so'm`
                  : p.price_label}
              </div>
              {p.in_stock === false ? (
                <button className="add-btn" disabled style={{ opacity: 0.5 }}>
                  Hozir yo'q
                </button>
              ) : !inCart ? (
                <button
                  className="add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(p, 1);
                  }}
                >
                  Savatga
                </button>
              ) : (
                <div className="quantity-controls" onClick={(e) => e.stopPropagation()}>
                  <button className="qty-btn" onClick={() => addToCart(p, -1)}>
                    −
                  </button>
                  <span className="qty-amount">{inCart.qty} ta</span>
                  <button className="qty-btn" onClick={() => addToCart(p, 1)}>
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {products.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--shop-hint)" }}>
            {showFavOnly ? "Sevimli mahsulot yo'q" : "Mahsulot topilmadi"}
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════
// CART
// ════════════════════════════════════════════════════════════
function CartView({
  cart,
  addToCart,
  removeFromCart,
  cartTotal,
  onCheckout,
}: {
  cart: CartItem[];
  addToCart: (p: Product, delta?: number) => void;
  removeFromCart: (p: Product) => void;
  cartTotal: number;
  onCheckout: () => void;
}) {
  if (cart.length === 0) {
    return (
      <div className="empty-state">
        <h3>Savat bo'sh</h3>
        <p>Mahsulotlar qo'shing va buyurtma bering</p>
      </div>
    );
  }

  return (
    <div className="cart-list">
      {cart.map((c) => (
        <div key={c.product.id} className="cart-item">
          {c.product.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.product.photo_url} alt={c.product.name} className="cart-item-img" />
          ) : (
            <div className="cart-item-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              📦
            </div>
          )}
          <div className="cart-item-info">
            <h4>{c.product.name}</h4>
            <p>
              {c.product.price > 0
                ? `${(c.product.price * c.qty).toLocaleString("uz-UZ")} so'm`
                : c.product.price_label}
            </p>
            <div className="cart-item-actions">
              <div className="quantity-controls" style={{ width: "auto", margin: 0, padding: "4px 6px" }}>
                <button className="qty-btn" onClick={() => addToCart(c.product, -1)}>
                  −
                </button>
                <span className="qty-amount" style={{ margin: "0 10px" }}>
                  {c.qty}
                </span>
                <button className="qty-btn" onClick={() => addToCart(c.product, 1)}>
                  +
                </button>
              </div>
              <button className="remove-btn" onClick={() => removeFromCart(c.product)} aria-label="O'chirish">
                🗑
              </button>
            </div>
          </div>
        </div>
      ))}
      <div style={{ height: 100 }} />
      <div className="cfcb">
        <div className="cfcb-row">
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Jami</div>
            <div className="cfcb-total">{cartTotal.toLocaleString("uz-UZ")} so'm</div>
          </div>
          <button className="cfcb-btn" onClick={onCheckout}>
            🛍 Buyurtma berish
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════
function OrdersView({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <h3>Buyurtmalar yo'q</h3>
        <p>Hali biror buyurtma qilmagansiz</p>
      </div>
    );
  }
  return (
    <div style={{ padding: 15 }}>
      {orders.map((o) => (
        <div key={o.id} className="info-card" style={{ margin: "0 0 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {new Date(o.created_at).toLocaleString("uz")}
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 8,
                background: o.status === "completed" ? "#dcfce7" : "#fef3c7",
                color: o.status === "completed" ? "#15803d" : "#92400e",
                fontWeight: 700,
              }}
            >
              {o.status}
            </span>
          </div>
          <div style={{ borderTop: "1px solid #faecf1", paddingTop: 8 }}>
            {o.items.map((it, i) => (
              <div key={i} className="info-row">
                <span style={{ fontSize: 13 }}>
                  {it.name} × {it.qty}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {(it.price * it.qty).toLocaleString("uz-UZ")} so'm
                </span>
              </div>
            ))}
            <div className="info-row" style={{ fontWeight: 800, marginTop: 6 }}>
              <span>Jami</span>
              <span>{o.total_uzs.toLocaleString("uz-UZ")} so'm</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════
function ProfileView({
  profile,
  setProfile,
}: {
  profile: { fullName: string; phone: string; address: string };
  setProfile: (p: { fullName: string; phone: string; address: string }) => void;
}) {
  return (
    <div className="info-card">
      <h3>Yetkazib berish ma'lumotlari</h3>
      <p style={{ marginBottom: 14 }}>Buyurtma berishda ishlatiladi. Bir marta saqlasangiz, keyin avtomatik to'ldiriladi.</p>
      <div className="form-group">
        <input
          className="form-control"
          placeholder="Ism Familiya"
          value={profile.fullName}
          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
        />
      </div>
      <div className="form-group">
        <input
          className="form-control"
          type="tel"
          placeholder="Telefon raqam"
          value={profile.phone}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
        />
      </div>
      <div className="form-group">
        <textarea
          className="form-control"
          placeholder="Manzil"
          rows={3}
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
        />
      </div>
      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
        ✓ Avtomatik mahalliy saqlanadi
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ABOUT
// ════════════════════════════════════════════════════════════
function AboutView({
  businessName,
  aboutText,
  contacts,
  workingHours,
  faq,
}: {
  businessName: string;
  aboutText: string;
  contacts: Contacts;
  workingHours: Record<string, [number, number] | null>;
  faq: Array<{ q: string; a: string }>;
}) {
  const days: Record<string, string> = {
    mon: "Dushanba", tue: "Seshanba", wed: "Chorshanba", thu: "Payshanba",
    fri: "Juma", sat: "Shanba", sun: "Yakshanba",
  };
  return (
    <>
      {aboutText && (
        <div className="info-card">
          <h3>Biz haqimizda</h3>
          <p>{aboutText}</p>
        </div>
      )}
      <div className="info-card">
        <h3>Aloqa</h3>
        {contacts.phone && (
          <div className="info-row">
            <span>📞 Telefon</span>
            <a href={`tel:${contacts.phone}`}>{contacts.phone}</a>
          </div>
        )}
        {contacts.address && (
          <div className="info-row">
            <span>📍 Manzil</span>
            <span>{contacts.address}</span>
          </div>
        )}
        {contacts.instagram && (
          <div className="info-row">
            <span>📸 Instagram</span>
            <a href={`https://instagram.com/${contacts.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">
              @{contacts.instagram.replace(/^@/, "")}
            </a>
          </div>
        )}
      </div>
      {Object.keys(workingHours).length > 0 && (
        <div className="info-card">
          <h3>Ish vaqti</h3>
          {Object.entries(workingHours).map(([d, h]) => (
            <div key={d} className="info-row">
              <span>{days[d] ?? d}</span>
              <span>{h ? `${h[0]}:00 – ${h[1]}:00` : "Dam"}</span>
            </div>
          ))}
        </div>
      )}
      {faq.length > 0 && (
        <div className="info-card">
          <h3>Tez-tez beriladigan savollar</h3>
          {faq.map((f, i) => (
            <details key={i} style={{ borderBottom: "1px solid #faecf1", padding: "12px 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, listStyle: "none" }}>+ {f.q}</summary>
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--shop-hint)" }}>{f.a}</div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// PRODUCT MODAL
// ════════════════════════════════════════════════════════════
function ProductModal({
  product,
  cart,
  favorites,
  toggleFav,
  addToCart,
  onClose,
}: {
  product: Product;
  cart: CartItem[];
  favorites: Record<string, boolean>;
  toggleFav: (id: string) => void;
  addToCart: (p: Product, delta?: number) => void;
  onClose: () => void;
}) {
  const inCart = cart.find((c) => c.product.id === product.id);
  const liked = !!favorites[product.id];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>{product.name}</h2>
          <span className="modal-close" onClick={onClose}>
            &times;
          </span>
        </div>
        {product.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photo_url} alt={product.name} className="modal-image" />
        ) : (
          <div
            className="modal-image"
            style={{
              background: "linear-gradient(135deg, var(--shop-grad-from), var(--shop-grad-to))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              color: "white",
              minHeight: 200,
            }}
          >
            📦
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <div className="product-price" style={{ fontSize: 22 }}>
            {product.price > 0
              ? `${product.price.toLocaleString("uz-UZ")} so'm`
              : product.price_label}
          </div>
          {product.duration && (
            <div style={{ fontSize: 13, color: "var(--shop-hint)", marginTop: 4 }}>
              ⏱ {product.duration}
            </div>
          )}
        </div>
        {product.description && (
          <p style={{ marginTop: 12, lineHeight: 1.6, color: "var(--shop-hint)" }}>
            {product.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button
            className="add-btn"
            style={{ width: 56, flexShrink: 0, background: "white", color: "var(--shop-text)", border: "1px solid #f0d4dc" }}
            onClick={() => toggleFav(product.id)}
          >
            {liked ? "❤️" : "🤍"}
          </button>
          {!inCart ? (
            <button className="add-btn" onClick={() => addToCart(product, 1)}>
              Savatga qo'shish
            </button>
          ) : (
            <div className="quantity-controls" style={{ flex: 1, marginTop: 0 }}>
              <button className="qty-btn" onClick={() => addToCart(product, -1)}>
                −
              </button>
              <span className="qty-amount">{inCart.qty} ta</span>
              <button className="qty-btn" onClick={() => addToCart(product, 1)}>
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHECKOUT MODAL
// ════════════════════════════════════════════════════════════
function CheckoutModal({
  profile,
  setProfile,
  onSubmit,
  onClose,
  total,
  submitting,
}: {
  profile: { fullName: string; phone: string; address: string };
  setProfile: (p: { fullName: string; phone: string; address: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  total: number;
  submitting: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Yetkazib berish</h3>
          <span className="modal-close" onClick={onClose}>
            &times;
          </span>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <input
              className="form-control"
              placeholder="Ism Familiya"
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <input
              className="form-control"
              type="tel"
              placeholder="Telefon raqam"
              required
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <textarea
              className="form-control"
              placeholder="Manzil"
              required
              rows={3}
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </div>
          <div
            style={{
              padding: 14,
              background: "white",
              borderRadius: 12,
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
            }}
          >
            <span>Jami:</span>
            <span style={{ color: "var(--shop-primary)" }}>{total.toLocaleString("uz-UZ")} so'm</span>
          </div>
          <button type="submit" className="add-btn" disabled={submitting}>
            {submitting ? "Yuborilmoqda..." : "✅ TASDIQLASH"}
          </button>
        </form>
      </div>
    </div>
  );
}
