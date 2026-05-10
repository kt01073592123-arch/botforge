"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type Promo = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_uzs: number | null;
  max_uses: number | null;
  used_count: number;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

export default function PromoPage() {
  const { id } = useParams<{ id: string }>();
  const [codes, setCodes] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [minOrder, setMinOrder] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/bots/${id}/promo`).then((r) => r.json());
    setCodes(r.codes ?? []);
    setLoading(false);
  }

  async function create() {
    setErr(null);
    const dv = parseInt(discountValue, 10);
    if (!code || !dv) {
      setErr("Kod va chegirma qiymatini kiriting");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discount_type: discountType,
          discount_value: dv,
          min_order_uzs: minOrder ? parseInt(minOrder, 10) : undefined,
          max_uses: maxUses ? parseInt(maxUses, 10) : undefined,
          valid_until: validUntil
            ? new Date(validUntil).toISOString()
            : undefined,
          description: description || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      // Reset
      setCode("");
      setDiscountValue("10");
      setMinOrder("");
      setMaxUses("");
      setValidUntil("");
      setDescription("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(codeId: string) {
    if (!confirm("Kodni o'chirishni tasdiqlang")) return;
    await fetch(`/api/bots/${id}/promo?codeId=${codeId}`, { method: "DELETE" });
    await load();
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    setCode(s);
  }

  return (
    <div>
      <Topbar title="Promo kodlar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Yangi kod yaratish */}
        <section className="panel p-4 space-y-3">
          <h2 className="font-semibold">🎟 Yangi promo kod</h2>

          <div>
            <label className="label">Kod (mijoz Mini App'da kiritadi)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1 font-mono uppercase"
                placeholder="TUG10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={generateCode}
                className="btn-ghost !py-2 !px-3 !text-xs"
              >
                🎲 Auto
              </button>
            </div>
          </div>

          <div>
            <label className="label">Chegirma turi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType("percent")}
                className={`panel p-2.5 text-sm transition ${discountType === "percent" ? "border-accent" : ""}`}
              >
                <div className="text-lg">%</div>
                <div className="text-xs text-muted">Foizli</div>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={`panel p-2.5 text-sm transition ${discountType === "fixed" ? "border-accent" : ""}`}
              >
                <div className="text-lg">so&apos;m</div>
                <div className="text-xs text-muted">Aniq summa</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">
                Qiymat ({discountType === "percent" ? "%" : "so'm"})
              </label>
              <input
                type="number"
                className="input"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "10" : "20000"}
                min={1}
                max={discountType === "percent" ? 100 : undefined}
              />
            </div>
            <div>
              <label className="label">Min. buyurtma (so&apos;m)</label>
              <input
                type="number"
                className="input"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Maksimum ishlatish</label>
              <input
                type="number"
                className="input"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="cheksiz"
              />
            </div>
            <div>
              <label className="label">Amal qilish muddati</label>
              <input
                type="date"
                className="input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Tavsif (ixtiyoriy)</label>
            <input
              className="input"
              placeholder="Masalan: Tug'ilgan kun aksiyasi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          {err && <div className="text-danger text-sm">{err}</div>}

          <button
            onClick={create}
            disabled={busy || !code || !discountValue}
            className="btn-primary w-full"
          >
            {busy ? "Yaratilmoqda…" : "🎟 Promo kodni yaratish"}
          </button>
        </section>

        {/* Mavjud kodlar */}
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">
            Mavjud kodlar ({codes.length})
          </h2>
          {loading ? (
            <div className="text-center text-muted py-6 text-sm">Yuklanmoqda…</div>
          ) : codes.length === 0 ? (
            <div className="panel p-6 text-center text-muted text-sm">
              Hali kod yo&apos;q. Yuqorida bittasini yarating.
            </div>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => {
                const expired =
                  c.valid_until && new Date(c.valid_until) < new Date();
                const exhausted =
                  c.max_uses != null && c.used_count >= c.max_uses;
                const inactive = !c.is_active || expired || exhausted;
                return (
                  <div
                    key={c.id}
                    className={`panel p-3 ${inactive ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-base text-accent">
                          {c.code}
                        </div>
                        {c.description && (
                          <div className="text-xs text-muted truncate">
                            {c.description}
                          </div>
                        )}
                        <div className="text-[11px] text-muted mt-1 space-y-0.5">
                          <div>
                            🎁{" "}
                            {c.discount_type === "percent"
                              ? `${c.discount_value}% chegirma`
                              : `${c.discount_value.toLocaleString()} so'm chegirma`}
                          </div>
                          {c.min_order_uzs && (
                            <div>📦 Min: {c.min_order_uzs.toLocaleString()} so&apos;m</div>
                          )}
                          {c.valid_until && (
                            <div>
                              ⏰ {new Date(c.valid_until).toLocaleDateString("uz-UZ")}
                              {expired && " (muddati tugagan)"}
                            </div>
                          )}
                          <div>
                            ✓ Ishlatilgan: {c.used_count}
                            {c.max_uses != null && ` / ${c.max_uses}`}
                            {exhausted && " (tugatilgan)"}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(c.id)}
                        className="btn-ghost !py-1 !px-2 !text-xs !text-danger"
                      >
                        O&apos;chirish
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
