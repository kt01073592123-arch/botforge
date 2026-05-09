// Admin panel layout — sidebar navigation.
// Faqat is_admin foydalanuvchi'ga ochiq.

import { redirect } from "next/navigation";
import Link from "next/link";
import { pageRequireAdmin } from "@/lib/admin_auth";

const NAV = [
  { href: "/admin/overview", label: "Umumiy", icon: "📊" },
  { href: "/admin/sellers", label: "Foydalanuvchilar", icon: "👥" },
  { href: "/admin/bots", label: "Botlar", icon: "🤖" },
  { href: "/admin/revenue", label: "Daromad", icon: "💰" },
  { href: "/admin/ai-costs", label: "AI cost", icon: "⚡" },
  { href: "/admin/system", label: "Tizim", icon: "🔧" },
  { href: "/admin/audit", label: "Audit", icon: "📜" },
  { href: "/admin/broadcast", label: "Broadcast", icon: "📢" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await pageRequireAdmin();
  if (!admin) redirect("/app");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Super Admin</div>
          <div className="text-sm font-bold mt-1">BotForge</div>
          <div className="text-xs text-gray-500 mt-2">@{admin.telegram_id}</div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              <span className="w-5 text-center">{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 text-xs">
          <Link href="/app" className="text-gray-400 hover:text-white">
            ← Seller panel
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
