"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import PhotoInput from "@/components/PhotoInput";
import type { BotData, ServiceItem, Category } from "@/lib/supabase/types";

const DAYS = [
  ["mon", "Du"],
  ["tue", "Se"],
  ["wed", "Ch"],
  ["thu", "Pa"],
  ["fri", "Ju"],
  ["sat", "Sh"],
  ["sun", "Ya"],
] as const;

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ServicesPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<BotData | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/bots/${id}/data`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? blank()));
  }, [id]);

  function blank(): BotData {
    return {
      bot_id: id,
      services: [],
      categories: [],
      working_hours: {},
      contacts: {},
      faq: [],
      custom_fields: {},
    };
  }

  async function save() {
    if (!data) return;
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/bots/${id}/data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: data.services,
          categories: data.categories ?? [],
          working_hours: data.working_hours,
          contacts: data.contacts,
          faq: data.faq,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="p-8 text-center text-muted text-sm">Yuklanmoqda…</div>;

  function updateService(i: number, patch: Partial<ServiceItem>) {
    if (!data) return;
    const next = [...data.services];
    next[i] = { ...next[i], ...patch };
    setData({ ...data, services: next });
  }

  function addService() {
    if (!data) return;
    setData({
      ...data,
      services: [...data.services, { name: "", price: "", in_stock: true }],
    });
    setExpandedItem(data.services.length);
  }

  function removeService(i: number) {
    if (!data) return;
    setData({ ...data, services: data.services.filter((_, j) => j !== i) });
    if (expandedItem === i) setExpandedItem(null);
  }

  // Bulk import — har qator: "nom, narx, tavsif (ixtiyoriy)"
  function bulkImport(text: string): number {
    if (!data) return 0;
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ServiceItem[] = [];
    for (const line of lines) {
      // CSV split (eng oddiy — vergul bo'yicha)
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0];
      const price = parts[1] ?? "";
      const description = parts.slice(2).join(", ").trim() || undefined;
      if (!name) continue;
      parsed.push({ name, price, description, in_stock: true });
    }
    if (parsed.length > 0) {
      setData({ ...data, services: [...data.services, ...parsed] });
    }
    return parsed.length;
  }

  function addCategory() {
    if (!data) return;
    const cats = data.categories ?? [];
    const name = prompt("Kategoriya nomi (masalan: Ichimliklar, Asosiy taom):");
    if (!name) return;
    setData({
      ...data,
      categories: [...cats, { id: genId(), name, position: cats.length }],
    });
  }

  function removeCategory(catId: string) {
    if (!data) return;
    if (!confirm("Kategoriyani o‘chirsangiz, ichidagi mahsulotlar 'Boshqa'ga o‘tadi.")) return;
    setData({
      ...data,
      categories: (data.categories ?? []).filter((c) => c.id !== catId),
      services: data.services.map((s) =>
        s.category_id === catId ? { ...s, category_id: undefined } : s
      ),
    });
  }

  const categories = data.categories ?? [];

  return (
    <div>
      <Topbar
        title="Xizmatlar va narxlar"
        back="back"
        right={
          <button onClick={save} disabled={busy} className="btn-primary !py-1.5 !px-3 !text-xs">
            {saved ? "✓ Saqlandi" : busy ? "..." : "Saqlash"}
          </button>
        }
      />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {/* Kategoriyalar */}
        <Section
          title="Kategoriyalar"
          subtitle="Mahsulotlarni guruhlash uchun (ixtiyoriy)"
          right={
            <button
              type="button"
              onClick={addCategory}
              className="btn-ghost !py-1 !px-2 !text-xs"
            >
              + Qo‘shish
            </button>
          }
        >
          {categories.length === 0 ? (
            <div className="text-xs text-muted">
              Kategoriyasiz ham bo‘ladi — barcha mahsulotlar bir ro‘yxatda turaveradi.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-panel border border-border text-xs"
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(c.id)}
                    className="text-muted hover:text-danger ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Mahsulotlar/Xizmatlar */}
        <Section
          title="Mahsulotlar va xizmatlar"
          subtitle={`Jami: ${data.services.length}`}
        >
          <div className="space-y-2">
            {data.services.map((s, i) => (
              <ServiceCard
                key={i}
                service={s}
                categories={categories}
                expanded={expandedItem === i}
                botId={id}
                onToggle={() => setExpandedItem(expandedItem === i ? null : i)}
                onChange={(patch) => updateService(i, patch)}
                onRemove={() => removeService(i)}
              />
            ))}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-ghost" onClick={addService}>
                + Bitta qo&apos;shish
              </button>
              <BulkImportButton onImport={bulkImport} />
            </div>
          </div>
        </Section>

        {/* Ish vaqti */}
        <Section title="Ish vaqti">
          <div className="space-y-2">
            {DAYS.map(([key, label]) => {
              const v = data.working_hours[key];
              const off = v === null || v === undefined;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-12 text-sm text-muted">{label}</div>
                  <label className="text-xs flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={(e) => {
                        const next = { ...data.working_hours };
                        if (e.target.checked) next[key] = [9, 18];
                        else next[key] = null;
                        setData({ ...data, working_hours: next });
                      }}
                    />
                    ochiq
                  </label>
                  {!off && (
                    <>
                      <input
                        type="number"
                        className="input w-20"
                        min={0}
                        max={23}
                        value={v?.[0] ?? 9}
                        onChange={(e) => {
                          const next = { ...data.working_hours };
                          next[key] = [Number(e.target.value), v?.[1] ?? 18];
                          setData({ ...data, working_hours: next });
                        }}
                      />
                      <span className="text-muted">—</span>
                      <input
                        type="number"
                        className="input w-20"
                        min={0}
                        max={23}
                        value={v?.[1] ?? 18}
                        onChange={(e) => {
                          const next = { ...data.working_hours };
                          next[key] = [v?.[0] ?? 9, Number(e.target.value)];
                          setData({ ...data, working_hours: next });
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Aloqa */}
        <Section title="Aloqa">
          <div className="space-y-2">
            <input
              className="input"
              placeholder="Telefon"
              value={data.contacts.phone ?? ""}
              onChange={(e) => setData({ ...data, contacts: { ...data.contacts, phone: e.target.value } })}
            />
            <input
              className="input"
              placeholder="Manzil"
              value={data.contacts.address ?? ""}
              onChange={(e) => setData({ ...data, contacts: { ...data.contacts, address: e.target.value } })}
            />
            <input
              className="input"
              placeholder="Instagram"
              value={data.contacts.instagram ?? ""}
              onChange={(e) => setData({ ...data, contacts: { ...data.contacts, instagram: e.target.value } })}
            />
          </div>
        </Section>

        {/* FAQ */}
        <Section title="FAQ">
          <div className="space-y-2">
            {data.faq.map((f, i) => (
              <div key={i} className="panel p-3 space-y-2">
                <input
                  className="input"
                  placeholder="Savol"
                  value={f.q}
                  onChange={(e) => {
                    const next = [...data.faq];
                    next[i] = { ...next[i], q: e.target.value };
                    setData({ ...data, faq: next });
                  }}
                />
                <textarea
                  className="input min-h-[60px]"
                  placeholder="Javob"
                  value={f.a}
                  onChange={(e) => {
                    const next = [...data.faq];
                    next[i] = { ...next[i], a: e.target.value };
                    setData({ ...data, faq: next });
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-danger"
                  onClick={() => setData({ ...data, faq: data.faq.filter((_, j) => j !== i) })}
                >
                  O‘chirish
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => setData({ ...data, faq: [...data.faq, { q: "", a: "" }] })}
            >
              + Savol-javob qo‘shish
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  categories,
  expanded,
  botId,
  onToggle,
  onChange,
  onRemove,
}: {
  service: ServiceItem;
  categories: Category[];
  expanded: boolean;
  botId: string;
  onToggle: () => void;
  onChange: (patch: Partial<ServiceItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="panel p-3 space-y-2">
      {/* Compact row */}
      <div className="flex gap-2 items-center">
        {service.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.photo_url}
            alt=""
            className="w-12 h-12 rounded-lg object-cover bg-border flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center flex-shrink-0 text-xl">
            {service.in_stock === false ? "🚫" : "📦"}
          </div>
        )}
        <input
          className="input flex-1 !text-sm"
          placeholder="Mahsulot/xizmat nomi"
          value={service.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          className="input w-28 !text-sm"
          placeholder="Narx"
          value={service.price}
          onChange={(e) => onChange({ price: e.target.value })}
        />
        <button type="button" className="btn-ghost !px-2 !text-xs" onClick={onToggle}>
          {expanded ? "▴" : "▾"}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div>
            <label className="label">Rasm</label>
            <PhotoInput
              botId={botId}
              value={service.photo_url}
              onChange={(url) => onChange({ photo_url: url })}
              productName={service.name}
              productDescription={service.description}
            />
          </div>

          <div>
            <label className="label">Tavsif (ixtiyoriy)</label>
            <textarea
              className="input min-h-[60px] !text-sm"
              placeholder="Mahsulot/xizmat haqida 1-2 jumla. AI mijozga aytishda ishlatadi."
              value={service.description ?? ""}
              onChange={(e) =>
                onChange({ description: e.target.value || undefined })
              }
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Davomiyligi</label>
              <input
                className="input !text-xs"
                placeholder="masalan: 2 soat, 30 daqiqa"
                value={service.duration ?? ""}
                onChange={(e) => onChange({ duration: e.target.value || undefined })}
              />
            </div>
            {categories.length > 0 && (
              <div className="flex-1">
                <label className="label">Kategoriya</label>
                <select
                  className="input !text-xs"
                  value={service.category_id ?? ""}
                  onChange={(e) =>
                    onChange({ category_id: e.target.value || undefined })
                  }
                >
                  <option value="">— hech qaysi —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={service.in_stock !== false}
              onChange={(e) => onChange({ in_stock: e.target.checked })}
            />
            Sotuvda bor (mavjud)
          </label>

          <button
            type="button"
            className="text-xs text-danger"
            onClick={onRemove}
          >
            O‘chirish
          </button>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            {title}
          </h2>
          {subtitle && <div className="text-[11px] text-muted">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function BulkImportButton({
  onImport,
}: {
  onImport: (text: string) => number;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  function apply() {
    const n = onImport(text);
    if (n === 0) {
      setInfo("Hech narsa import qilinmadi");
      return;
    }
    setInfo(`✓ ${n} ta mahsulot qo'shildi. Yuqorida ko'ring va saqlash bosing.`);
    setText("");
    setTimeout(() => {
      setOpen(false);
      setInfo(null);
    }, 2000);
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        📋 Bulk import
      </button>
    );
  }

  return (
    <div className="col-span-2 panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">📋 Bulk import</div>
        <button
          type="button"
          className="text-xs text-muted"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>
      <div className="text-[11px] text-muted leading-relaxed">
        Har qator bitta mahsulot. Format: <code>nom, narx, tavsif</code>
        <br />
        Tavsif ixtiyoriy. Vergul bo&apos;lsa, qo&apos;shtirnoq ishlatmang — sodda matn yozing.
      </div>
      <textarea
        className="input min-h-[140px] font-mono !text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Niacinamide serum, 120000 so'm, 30ml shisha
SPF 50+ kunlik krem, 150000 so'm, 50ml
Hyaluronic acid kremi, 110000 so'm
Soch maskasi, 85000 so'm, 250ml`}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary !py-1.5 !text-xs flex-1"
          onClick={apply}
          disabled={!text.trim()}
        >
          Qo&apos;shish
        </button>
        <button
          type="button"
          className="btn-ghost !py-1.5 !text-xs"
          onClick={() => setText("")}
        >
          Tozalash
        </button>
      </div>
      {info && (
        <div className={`text-xs ${info.startsWith("✓") ? "text-accent" : "text-muted"}`}>
          {info}
        </div>
      )}
    </div>
  );
}
