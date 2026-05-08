"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type Review = {
  id: string;
  rating: number;
  text: string | null;
  customer_name: string | null;
  is_published: boolean;
  created_at: string;
};

export default function ReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Review[]>([]);

  useEffect(() => {
    fetch(`/api/bots/${id}/reviews`)
      .then((r) => r.json())
      .then((d) => setItems(d.reviews ?? []));
  }, [id]);

  async function toggle(reviewId: string, is_published: boolean) {
    await fetch(`/api/bots/${id}/reviews?reviewId=${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published }),
    });
    setItems((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, is_published } : r))
    );
  }

  const avg =
    items.length > 0
      ? items.reduce((s, r) => s + r.rating, 0) / items.length
      : 0;

  return (
    <div>
      <Topbar title="Sharhlar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {items.length > 0 && (
          <div className="panel p-4 text-center">
            <div className="text-3xl font-bold">⭐ {avg.toFixed(1)}</div>
            <div className="text-xs text-muted">{items.length} ta sharh</div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">⭐</div>
            <div className="text-sm text-muted">Hali sharh yo‘q</div>
            <div className="text-xs text-muted mt-2">
              Buyurtma bajarilgandan keyin mijoz Customer WebApp’dan baho beradi
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className={`panel p-3 ${!r.is_published ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-amber-400 text-sm">
                      {"⭐".repeat(r.rating)}
                      <span className="text-muted">{"⭐".repeat(5 - r.rating)}</span>
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {r.customer_name ?? "Anonim"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("uz-UZ")}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={r.is_published}
                      onChange={(e) => toggle(r.id, e.target.checked)}
                    />
                    Public
                  </label>
                </div>
                {r.text && <div className="text-sm mt-2">{r.text}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
