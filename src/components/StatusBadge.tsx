import type { BotStatus } from "@/lib/supabase/types";
import clsx from "clsx";

const map: Record<BotStatus, { text: string; cls: string }> = {
  draft:  { text: "Tayyorlanmoqda", cls: "border-muted/40 text-muted" },
  active: { text: "Faol", cls: "border-success/40 text-success bg-success/10" },
  paused: { text: "Pauza", cls: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
  error:  { text: "Xatolik", cls: "border-danger/40 text-danger bg-danger/10" },
};

export default function StatusBadge({ status }: { status: BotStatus }) {
  const m = map[status];
  return <span className={clsx("badge", m.cls)}>● {m.text}</span>;
}
