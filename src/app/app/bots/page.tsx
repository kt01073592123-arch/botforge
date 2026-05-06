"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import type { BotRow } from "@/lib/supabase/types";

export default function BotsPage() {
  const [bots, setBots] = useState<BotRow[] | null>(null);

  useEffect(() => {
    fetch("/api/bots")
      .then((r) => r.json())
      .then((d) => setBots(d.bots ?? []));
  }, []);

  return (
    <div>
      <Topbar
        title="Mening botlarim"
        right={
          <Link href="/app/bots/new" className="btn-primary !py-1.5 !px-3 !text-xs">
            + Yangi bot
          </Link>
        }
      />
      <div className="max-w-3xl mx-auto px-4 py-4">
        {bots === null ? (
          <div className="text-sm text-muted py-8 text-center">Yuklanmoqda…</div>
        ) : bots.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {bots.map((b) => (
              <Link
                key={b.id}
                href={`/app/bots/${b.id}`}
                className="panel p-4 flex items-center gap-3 hover:border-accent transition"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{b.name}</div>
                  <div className="text-xs text-muted truncate">
                    {b.business_name ?? "—"}
                    {b.tg_username && ` · @${b.tg_username}`}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel p-8 text-center">
      <div className="text-4xl mb-3">✨</div>
      <div className="font-semibold mb-1">Hali bot yaratmagansiz</div>
      <div className="text-sm text-muted mb-5">
        Bir nechta tugma bilan o‘zingizning AI manager botingizni yarating.
      </div>
      <Link href="/app/bots/new" className="btn-primary">
        Bot yaratish
      </Link>
    </div>
  );
}
