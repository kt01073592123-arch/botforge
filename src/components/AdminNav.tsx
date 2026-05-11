"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/hooks/useT";

const NAV_ITEMS = [
  { href: "/admin/overview",  key: "adm_nav_overview",  icon: "📊" },
  { href: "/admin/sellers",   key: "adm_nav_sellers",   icon: "👥" },
  { href: "/admin/bots",      key: "adm_nav_bots",      icon: "🤖" },
  { href: "/admin/revenue",   key: "adm_nav_revenue",   icon: "💰" },
  { href: "/admin/ai-costs",  key: "adm_nav_ai_costs",  icon: "⚡" },
  { href: "/admin/system",    key: "adm_nav_system",    icon: "🔧" },
  { href: "/admin/audit",     key: "adm_nav_audit",     icon: "📜" },
  { href: "/admin/broadcast", key: "adm_nav_broadcast", icon: "📢" },
];

export default function AdminNav() {
  const { t } = useT();
  const path = usePathname();

  return (
    <nav className="flex-1 p-2 space-y-1">
      {NAV_ITEMS.map((n) => {
        const active = path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
              active
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="w-5 text-center">{n.icon}</span>
            <span>{t(n.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
