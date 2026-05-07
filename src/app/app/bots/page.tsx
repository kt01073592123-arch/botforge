"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import Onboarding from "@/components/Onboarding";
import LangSwitch from "@/components/LangSwitch";
import { useT } from "@/hooks/useT";
import type { BotRow } from "@/lib/supabase/types";

export default function BotsPage() {
  const [bots, setBots] = useState<BotRow[] | null>(null);
  const { t } = useT();

  useEffect(() => {
    fetch("/api/bots")
      .then((r) => r.json())
      .then((d) => setBots(d.bots ?? []));
  }, []);

  return (
    <div>
      <Topbar
        title={t("my_bots")}
        right={
          <div className="flex gap-2 items-center">
            <LangSwitch />
            <Link href="/app/billing" className="btn-ghost !py-1.5 !px-3 !text-xs">
              💎
            </Link>
            <Link href="/app/bots/new" className="btn-primary !py-1.5 !px-3 !text-xs">
              {t("new_bot")}
            </Link>
          </div>
        }
      />
      <div className="max-w-3xl mx-auto px-4 py-4">
        {bots === null ? (
          <div className="text-sm text-muted py-8 text-center">{t("loading")}</div>
        ) : bots.length === 0 ? (
          <Onboarding />
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
