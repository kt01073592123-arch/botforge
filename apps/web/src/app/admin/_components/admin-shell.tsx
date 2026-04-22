'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, type AuthUser } from '@/lib/auth'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/admin',             label: 'Overview'    },
  { href: '/admin/users',       label: 'Users'       },
  { href: '/admin/projects',    label: 'Projects'    },
  { href: '/admin/payments',    label: 'Payments'    },
  { href: '/admin/deployments', label: 'Deployments' },
]

// ── Shell ─────────────────────────────────────────────────────────────────────

/**
 * Client component that:
 *   1. Fetches the current user and verifies ADMIN role.
 *   2. Redirects to /login if unauthenticated, /dashboard if not admin.
 *   3. Renders the admin chrome (header + sidebar nav + main content area).
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [user, setUser]   = useState<AuthUser | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u)                  { router.replace('/login');     return }
      if (u.role !== 'ADMIN')  { router.replace('/dashboard'); return }
      setUser(u)
      setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-bold text-gray-900">
              BotForge Admin
            </Link>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              INTERNAL
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{user?.email}</span>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← User dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        {/* Sidebar nav */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={[
                      'block rounded-lg px-3 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
