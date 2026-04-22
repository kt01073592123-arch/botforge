import DashboardHeader from '@/components/dashboard-header'

// Shared layout for all /dashboard/* pages.
// DashboardHeader is a client component — the layout itself stays a Server Component.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      {children}
    </div>
  )
}
