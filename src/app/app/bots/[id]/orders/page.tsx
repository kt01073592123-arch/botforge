"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import clsx from "clsx";

type Item = { name: string; price: string; qty: number };
type Status = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_tg_username: string | null;
  items: Item[];
  total_uzs: number;
  note: string | null;
  status: Status;
  created_at: string;
};

const STATUS_FLOW: Record<Status, { label: string; emoji: string; cls: string; nextActions: { to: Status; label: string }[] }> = {
  pending: {
    label: "Yangi", emoji: "🆕",
    cls: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    nextActions: [
      { to: "confirmed", label: "✓ Tasdiqlash" },
      { to: "cancelled", label: "Bekor" },
    ],
  },
  confirmed: {
    label: "Tasdiqlandi", emoji: "✅",
    cls: "border-success/40 text-success bg-success/10",
    nextActions: [
      { to: "in_progress", label: "🔄 Boshlash" },
      { to: "cancelled", label: "Bekor" },
    ],
  },
  in_progress: {
    label: "Bajarilmoqda", emoji: "🔄",
    cls: "border-accent/40 text-accent bg-accent/10",
    nextActions: [
      { to: "completed", label: "✓ Bajarildi" },
    ],
  },
  completed: {
    label: "Bajarildi", emoji: "✓",
    cls: "border-accent2/40 text-accent2 bg-accent2/10",
    nextActions: [],
  },
  cancelled: {
    label: "Bekor", emoji: "❌",
    cls: "border-muted/40 text-muted",
    nextActions: [],
  },
};

export default function OrdersPage() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"active" | "all" | Status>("active");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id, filter]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "active") {
      ["pending", "confirmed", "in_progress"].forEach((s) => params.append("status", s));
    } else if (filter !== "all") {
      params.set("status", filter);
    }
    const r = await fetch(`/api/bots/${id}/orders?${params}`).then((r) => r.json());
    setOrders(r.orders ?? []);
    setLoading(false);
  }

  async function changeStatus(orderId: string, status: Status) {
    setBusy(orderId);
    try {
      await fetch(`/api/bots/${id}/orders?orderId=${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const counts = orders.reduce(
    (acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }),
    {} as Record<Status, number>
  );

  return (
    <div>
      <Topbar title="Buyurtmalar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={filter === "active"} onClick={() => setFilter("active")}>
            Faol
          </Chip>
          {(["pending", "confirmed", "in_progress", "completed", "cancelled"] as Status[]).map(
            (s) => (
              <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
                {STATUS_FLOW[s].emoji} {STATUS_FLOW[s].label}
                {counts[s] !== undefined && filter === "all" && ` ${counts[s]}`}
              </Chip>
            )
          )}
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Hammasi
          </Chip>
        </div>

        {loading ? (
          <div className="text-center text-muted py-8 text-sm">Yuklanmoqda…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🛒</div>
            <div className="text-sm text-muted">Buyurtma yo‘q</div>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                busy={busy === o.id}
                onStatus={(s) => changeStatus(o.id, s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "shrink-0 px-3 py-1 rounded-full text-xs border whitespace-nowrap",
        active ? "bg-accent text-white border-accent" : "bg-panel border-border text-muted"
      )}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order,
  busy,
  onStatus,
}: {
  order: Order;
  busy: boolean;
  onStatus: (s: Status) => void;
}) {
  const stat = STATUS_FLOW[order.status];
  return (
    <div className="panel p-3 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-xs text-muted">
            #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}
          </div>
          <div className="font-bold text-base mt-0.5">
            {order.customer_name ?? "—"}
          </div>
          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="text-xs text-accent block"
            >
              📞 {order.customer_phone}
            </a>
          )}
          {order.customer_tg_username && (
            <a
              href={`https://t.me/${order.customer_tg_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs block"
            >
              @{order.customer_tg_username}
            </a>
          )}
        </div>
        <span className={clsx("badge", stat.cls)}>
          {stat.emoji} {stat.label}
        </span>
      </div>

      <div className="text-xs space-y-0.5 pt-1 border-t border-border">
        {order.items.map((it, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-muted">
              {it.name} × {it.qty}
            </span>
            <span>{it.price}</span>
          </div>
        ))}
        {order.note && <div className="italic mt-1">📝 {order.note}</div>}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-xs text-muted">JAMI</span>
        <span className="text-base font-bold text-accent">
          {order.total_uzs.toLocaleString("uz-UZ")} so‘m
        </span>
      </div>

      {stat.nextActions.length > 0 && (
        <div className="flex gap-1.5 pt-1">
          {stat.nextActions.map((a) => (
            <button
              key={a.to}
              disabled={busy}
              onClick={() => onStatus(a.to)}
              className={clsx(
                "!py-1.5 !px-3 !text-xs",
                a.to === "cancelled" ? "btn-ghost !text-danger" : "btn-primary"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
