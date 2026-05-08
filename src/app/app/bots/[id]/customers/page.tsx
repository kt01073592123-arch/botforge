"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type Customer = {
  id: string;
  tg_user_id: number;
  display_name: string | null;
  phone: string | null;
  username: string | null;
  tags: string[];
  total_orders: number;
  total_spent_uzs: number;
  loyalty_points: number;
  last_seen_at: string;
};

export default function CustomersPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const r = await fetch(`/api/bots/${id}/customers?${params}`).then((r) => r.json());
    setItems(r.customers ?? []);
    setLoading(false);
  }

  return (
    <div>
      <Topbar title="Mijozlar (CRM)" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        <input
          className="input"
          placeholder="Qidirish (ism, telefon, username)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center text-muted py-8 text-sm">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-sm text-muted">
              {search ? "Hech narsa topilmadi" : "Hali mijoz yo‘q"}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/app/bots/${id}/customers/${c.id}`}
                className="panel p-3 block hover:border-accent transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {c.display_name ?? "—"}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {c.phone ?? ""}
                      {c.username && ` · @${c.username}`}
                    </div>
                    {c.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {c.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-accent font-bold">
                      {c.total_spent_uzs > 0
                        ? `${c.total_spent_uzs.toLocaleString("uz-UZ")} so‘m`
                        : "—"}
                    </div>
                    <div className="text-muted">
                      {c.total_orders > 0 && `${c.total_orders} buyurtma`}
                    </div>
                    {c.loyalty_points > 0 && (
                      <div className="text-amber-400 mt-0.5">
                        ⭐ {c.loyalty_points}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
