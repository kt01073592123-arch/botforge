"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type Customer = {
  id: string;
  display_name: string | null;
  phone: string | null;
  username: string | null;
  tags: string[];
  notes: string | null;
  total_orders: number;
  total_spent_uzs: number;
  loyalty_points: number;
  first_seen_at: string;
  last_seen_at: string;
};

const SUGGESTED_TAGS = ["VIP", "Doimiy", "Yangi", "Yo‘qotilgan", "Shikoyat"];

export default function CustomerDetailPage() {
  const { id, customerId } = useParams<{ id: string; customerId: string }>();
  const [data, setData] = useState<{
    customer: Customer;
    orders: Array<{ id: string; total_uzs: number; status: string; created_at: string }>;
    bookings: Array<{ id: string; service_name: string; slot_start: string; status: string }>;
    leads: Array<{ id: string; request: string; created_at: string }>;
  } | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, [customerId]);

  async function load() {
    const r = await fetch(`/api/bots/${id}/customers/${customerId}`).then((r) =>
      r.json()
    );
    if (r.customer) {
      r.customer.tags =
        typeof r.customer.tags === "string"
          ? JSON.parse(r.customer.tags)
          : r.customer.tags ?? [];
      setData(r);
      setNotes(r.customer.notes ?? "");
    }
  }

  async function saveTags(tags: string[]) {
    setBusy(true);
    await fetch(`/api/bots/${id}/customers?customerId=${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    setBusy(false);
    await load();
  }

  async function saveNotes() {
    setBusy(true);
    await fetch(`/api/bots/${id}/customers?customerId=${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setBusy(false);
  }

  if (!data) return <div className="p-8 text-center text-muted text-sm">Yuklanmoqda…</div>;

  const c = data.customer;

  return (
    <div>
      <Topbar title={c.display_name ?? "Mijoz"} back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="panel p-4">
          <div className="font-bold text-lg">{c.display_name ?? "—"}</div>
          <div className="text-sm text-muted space-y-0.5 mt-1">
            {c.phone && (
              <a href={`tel:${c.phone}`} className="block text-accent">
                📞 {c.phone}
              </a>
            )}
            {c.username && (
              <a
                href={`https://t.me/${c.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                💬 @{c.username}
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Buyurtmalar" value={c.total_orders} />
          <Stat
            label="Jami xarajat"
            value={`${(c.total_spent_uzs / 1000).toFixed(0)}k`}
          />
          <Stat label="Loyalty ⭐" value={c.loyalty_points} />
        </div>

        {/* Tags */}
        <div className="panel p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Teglar</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {c.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 flex items-center gap-1"
              >
                {t}
                <button
                  onClick={() => saveTags(c.tags.filter((x) => x !== t))}
                  className="text-muted hover:text-danger"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <input
              className="input flex-1 !text-xs"
              placeholder="Yangi teg..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  saveTags([...c.tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
            />
            <button
              disabled={busy || !tagInput.trim()}
              onClick={() => {
                saveTags([...c.tags, tagInput.trim()]);
                setTagInput("");
              }}
              className="btn-primary !py-1.5 !px-3 !text-xs"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_TAGS.filter((t) => !c.tags.includes(t)).map((t) => (
              <button
                key={t}
                onClick={() => saveTags([...c.tags, t])}
                className="text-[10px] px-2 py-0.5 rounded-full bg-panel border border-border text-muted hover:border-accent"
              >
                + {t}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="panel p-4">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Izoh</div>
          <textarea
            className="input min-h-[80px] !text-sm"
            placeholder="Mijoz haqida shaxsiy eslatma (alergiya, kayfiyat, afzalliklar...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </div>

        {/* History */}
        {data.orders.length > 0 && (
          <Section title="Buyurtmalar">
            {data.orders.map((o) => (
              <div key={o.id} className="text-xs flex justify-between py-1">
                <span>
                  {new Date(o.created_at).toLocaleDateString("uz-UZ")} ·{" "}
                  <span className="text-muted">{o.status}</span>
                </span>
                <span className="font-semibold">
                  {o.total_uzs.toLocaleString("uz-UZ")} so‘m
                </span>
              </div>
            ))}
          </Section>
        )}

        {data.bookings.length > 0 && (
          <Section title="Bronlar">
            {data.bookings.map((b) => (
              <div key={b.id} className="text-xs flex justify-between py-1">
                <span>
                  {new Date(b.slot_start).toLocaleString("uz-UZ", {
                    timeZone: "Asia/Tashkent",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {b.service_name}
                </span>
                <span className="text-muted">{b.status}</span>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-muted uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}
