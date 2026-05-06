"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { BotData } from "@/lib/supabase/types";

const DAYS = [
  ["mon", "Du"],
  ["tue", "Se"],
  ["wed", "Ch"],
  ["thu", "Pa"],
  ["fri", "Ju"],
  ["sat", "Sh"],
  ["sun", "Ya"],
] as const;

export default function ServicesPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<BotData | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/bots/${id}/data`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? blank()));
  }, [id]);

  function blank(): BotData {
    return {
      bot_id: id,
      services: [],
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
        <Section title="Xizmatlar va narxlar">
          <div className="space-y-2">
            {data.services.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Xizmat nomi"
                  value={s.name}
                  onChange={(e) => {
                    const next = [...data.services];
                    next[i] = { ...next[i], name: e.target.value };
                    setData({ ...data, services: next });
                  }}
                />
                <input
                  className="input w-32"
                  placeholder="Narx"
                  value={s.price}
                  onChange={(e) => {
                    const next = [...data.services];
                    next[i] = { ...next[i], price: e.target.value };
                    setData({ ...data, services: next });
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost !px-3"
                  onClick={() =>
                    setData({ ...data, services: data.services.filter((_, j) => j !== i) })
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() =>
                setData({ ...data, services: [...data.services, { name: "", price: "" }] })
              }
            >
              + Xizmat qo‘shish
            </button>
          </div>
        </Section>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2 text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  );
}
