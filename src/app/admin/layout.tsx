// Admin panel layout — sidebar navigation + topbar with LangSwitch.
// Faqat is_admin foydalanuvchi'ga ochiq.

import { redirect } from "next/navigation";
import Link from "next/link";
import { pageRequireAdmin } from "@/lib/admin_auth";
import AdminNav from "@/components/AdminNav";
import LangSwitch from "@/components/LangSwitch";

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

        <AdminNav />

        <div className="p-3 border-t border-gray-800 text-xs">
          <Link href="/app" className="text-gray-400 hover:text-white">
            ← Seller panel
          </Link>
        </div>
      </aside>

      {/* Right side: topbar + main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-6 flex-shrink-0">
          <LangSwitch />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
