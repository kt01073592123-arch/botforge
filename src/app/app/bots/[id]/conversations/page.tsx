"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { ConversationRow } from "@/lib/supabase/types";

export default function ConversationsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<ConversationRow[] | null>(null);
  useEffect(() => {
    fetch(`/api/bots/${id}/conversations`)
      .then((r) => r.json())
      .then((d) => setItems(d.conversations ?? []));
  }, [id]);

  return (
    <div>
      <Topbar title="Suhbatlar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4">
        {items === null ? (
          <div className="text-center text-muted text-sm py-8">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted text-sm py-8">Hali suhbat yo‘q</div>
        ) : (
          <div className="grid gap-2">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/app/bots/${id}/conversations/${c.id}`}
                className="panel p-3 flex justify-between items-center hover:border-accent"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {c.customer_name ?? "Anonim"}{" "}
                    {c.customer_username && (
                      <span className="text-xs text-muted">@{c.customer_username}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {c.message_count} ta xabar · {new Date(c.last_message_at).toLocaleString("uz")}
                  </div>
                </div>
                {c.status === "waiting_human" && (
                  <span className="badge border-amber-500/40 text-amber-400 bg-amber-500/10">
                    Operator
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
