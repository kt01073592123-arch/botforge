"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { LeadRow } from "@/lib/supabase/types";

export default function LeadsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<LeadRow[] | null>(null);

  useEffect(() => {
    fetch(`/api/bots/${id}/leads`)
      .then((r) => r.json())
      .then((d) => setItems(d.leads ?? []));
  }, [id]);

  return (
    <div>
      <Topbar title="Leadlar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4">
        {items === null ? (
          <div className="text-center text-muted py-8">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted py-8">Hali lead yo‘q</div>
        ) : (
          <div className="grid gap-2">
            {items.map((l) => (
              <div key={l.id} className="panel p-3">
                <div className="font-semibold">{l.name ?? "—"}</div>
                <div className="text-sm">{l.phone ?? "—"}</div>
                {l.request && <div className="text-sm text-muted mt-1">{l.request}</div>}
                <div className="text-xs text-muted mt-1">
                  {new Date(l.created_at).toLocaleString("uz")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
