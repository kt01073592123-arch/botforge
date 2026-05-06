"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Topbar({
  title,
  back,
  right,
}: {
  title: string;
  back?: string;
  right?: React.ReactNode;
}) {
  const r = useRouter();
  return (
    <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
        {back ? (
          <button onClick={() => (back === "back" ? r.back() : r.push(back))} className="text-muted hover:text-text">
            ←
          </button>
        ) : (
          <Link href="/app/bots" className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2" />
          </Link>
        )}
        <div className="flex-1 font-semibold truncate">{title}</div>
        {right}
      </div>
    </div>
  );
}
