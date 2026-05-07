"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { LeadRow } from "@/lib/supabase/types";
import clsx from "clsx";

const STATUS: { v: LeadRow["status"]; label: string; cls: string }[] = [
  { v: "new", label: "Yangi", cls: "border-accent/40 text-accent bg-accent/10" },
  { v: "contacted", label: "Bog‘lanildi", cls: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
  { v: "converted", label: "Mijoz", cls: "border-success/40 text-success bg-success/10" },
  { v: "lost", label: "Yo‘qotildi", cls: "border-muted/40 text-muted" },
];

export default function LeadsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<LeadRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | LeadRow["status"]>("all");

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const d = await fetch(`/api/bots/${id}/leads`).then((r) => r.json());
    setItems(d.leads ?? []);
  }

  async function updateStatus(leadId: string, status: LeadRow["status"]) {
    await fetch(`/api/bots/${id}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setItems((prev) => prev?.map((l) => (l.id === leadId ? { ...l, status } : l)) ?? null);
  }

  async function remove(leadId: string) {
    if (!confirm("O‘chirilsinmi?")) return;
    await fetch(`/api/bots/${id}/leads/${leadId}`, { method: "DELETE" });
    setItems((prev) => prev?.filter((l) => l.id !== leadId) ?? null);
  }

  const filtered = items?.filter((l) => filter === "all" || l.status === filter);

  return (
    <div>
      <Topbar title="Leadlar" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Hammasi {items && `· ${items.length}`}
          </Chip>
          {STATUS.map((s) => (
            <Chip
              key={s.v}
              active={filter === s.v}
              onClick={() => setFilter(s.v)}
            >
              {s.label}
              {items && ` · ${items.filter((i) => i.status === s.v).length}`}
            </Chip>
          ))}
        </div>

        {items === null ? (
          <div className="text-center text-muted py-8">Yuklanmoqda…</div>
        ) : filtered?.length === 0 ? (
          <div className="text-center text-muted py-8">Bu turkumda lead yo‘q</div>
        ) : (
          <div className="grid gap-2">
            {filtered?.map((l) => (
              <div key={l.id} className="panel p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{l.name ?? "—"}</div>
                    {l.phone && (
                      <a href={`tel:${l.phone}`} className="text-sm text-accent">
                        {l.phone}
                      </a>
                    )}
                  </div>
                  <span
                    className={clsx(
                      "badge",
                      STATUS.find((s) => s.v === l.status)?.cls ?? ""
                    )}
                  >
                    {STATUS.find((s) => s.v === l.status)?.label}
                  </span>
                </div>
                {l.request && (
                  <div className="text-sm text-muted mb-2 leading-snug">{l.request}</div>
                )}
                <div className="text-[11px] text-muted mb-2">
                  {new Date(l.created_at).toLocaleString("uz")}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUS.filter((s) => s.v !== l.status).map((s) => (
                    <button
                      key={s.v}
                      onClick={() => updateStatus(l.id, s.v)}
                      className="btn-ghost !py-1 !px-2 !text-[11px]"
                    >
                      → {s.label}
                    </button>
                  ))}
                  <button
                    onClick={() => remove(l.id)}
                    className="btn-ghost !py-1 !px-2 !text-[11px] !text-danger"
                  >
                    O‘chirish
                  </button>
                </div>
              </div>
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
        "shrink-0 px-3 py-1 rounded-full text-xs border transition",
        active
          ? "bg-accent text-white border-accent"
          : "bg-panel border-border text-muted hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
