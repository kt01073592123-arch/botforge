import AdminShell from './_components/admin-shell'

// Server component — delegates all auth/role logic to the AdminShell client component.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
