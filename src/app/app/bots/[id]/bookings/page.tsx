"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import clsx from "clsx";

type Booking = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_tg_username: string | null;
  slot_start: string;
  slot_end: string;
  service_name: string;
  service_price: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
};

const STATUS_LABELS: Record<Booking["status"], { label: string; cls: string; emoji: string }> = {
  pending: { label: "Yangi", emoji: "⏳", cls: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
  confirmed: { label: "Tasdiqlandi", emoji: "✅", cls: "border-success/40 text-success bg-success/10" },
  cancelled: { label: "Bekor", emoji: "❌", cls: "border-muted/40 text-muted" },
  completed: { label: "Bajarildi", emoji: "✓", cls: "border-accent2/40 text-accent2 bg-accent2/10" },
  no_show: { label: "Kelmadi", emoji: "👻", cls: "border-danger/40 text-danger" },
};

export default function BookingsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "all" | "pending">("upcoming");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id, filter]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "pending") params.set("status", "pending");
    if (filter === "upcoming") {
      params.set("status", "pending");
      params.append("status", "confirmed");
      params.set("from", new Date().toISOString());
    }
    const res = await fetch(`/api/bots/${id}/bookings?${params}`).then((r) => r.json());
    setItems(res.bookings ?? []);
    setLoading(false);
  }

  async function changeStatus(bookingId: string, status: Booking["status"]) {
    setBusy(bookingId);
    try {
      await fetch(`/api/bots/${id}/bookings?bookingId=${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  // Sana bo‘yicha guruhlash
  const grouped = new Map<string, Booking[]>();
  for (const b of items) {
    const day = new Date(b.slot_start).toLocaleDateString("uz-UZ", {
      timeZone: "Asia/Tashkent",
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(b);
  }

  return (
    <div>
      <Topbar title="Bronlar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            ["upcoming", "Yaqin"],
            ["pending", "Yangi"],
            ["all", "Hammasi"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v as typeof filter)}
              className={clsx(
                "px-3 py-1 rounded-full text-xs border whitespace-nowrap",
                filter === v
                  ? "bg-accent text-white border-accent"
                  : "bg-panel border-border text-muted"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-muted py-8 text-sm">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-sm text-muted">
              {filter === "pending"
                ? "Yangi bron yo‘q"
                : filter === "upcoming"
                ? "Yaqin bron yo‘q"
                : "Hali bron qabul qilinmagan"}
            </div>
          </div>
        ) : (
          [...grouped.entries()].map(([day, bks]) => (
            <div key={day}>
              <div className="text-xs text-muted uppercase tracking-wider mb-1.5 mt-2">
                {day}
              </div>
              <div className="space-y-2">
                {bks.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    busy={busy === b.id}
                    onStatus={(s) => changeStatus(b.id, s)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  busy,
  onStatus,
}: {
  booking: Booking;
  busy: boolean;
  onStatus: (s: Booking["status"]) => void;
}) {
  const stat = STATUS_LABELS[booking.status];
  const time = new Date(booking.slot_start).toLocaleTimeString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="panel p-3">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-bold">{time}</div>
            <span className={clsx("badge", stat.cls)}>
              {stat.emoji} {stat.label}
            </span>
          </div>
          <div className="text-sm font-medium mt-1">{booking.service_name}</div>
        </div>
        {booking.service_price && (
          <div className="text-sm font-bold text-accent whitespace-nowrap">
            {booking.service_price}
          </div>
        )}
      </div>

      <div className="text-xs text-muted space-y-0.5 mb-2">
        <div>👤 {booking.customer_name ?? "—"}</div>
        {booking.customer_phone && (
          <a href={`tel:${booking.customer_phone}`} className="block text-accent">
            📞 {booking.customer_phone}
          </a>
        )}
        {booking.customer_tg_username && (
          <a
            href={`https://t.me/${booking.customer_tg_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            @{booking.customer_tg_username}
          </a>
        )}
        {booking.notes && (
          <div className="italic mt-1">📝 {booking.notes}</div>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {booking.status === "pending" && (
          <button
            disabled={busy}
            onClick={() => onStatus("confirmed")}
            className="btn-primary !py-1 !px-2 !text-xs"
          >
            ✓ Tasdiqlash
          </button>
        )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <>
            <button
              disabled={busy}
              onClick={() => onStatus("cancelled")}
              className="btn-ghost !py-1 !px-2 !text-xs !text-danger"
            >
              Bekor qilish
            </button>
            <button
              disabled={busy}
              onClick={() => onStatus("completed")}
              className="btn-ghost !py-1 !px-2 !text-xs"
            >
              ✓ Bajarildi
            </button>
            <button
              disabled={busy}
              onClick={() => onStatus("no_show")}
              className="btn-ghost !py-1 !px-2 !text-xs !text-muted"
            >
              👻 Kelmadi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
