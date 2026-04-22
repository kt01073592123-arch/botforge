'use client'

import { useEffect, useState } from 'react'
import { getAdminUsers, type AdminUser } from '@/lib/admin'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Users</h1>
      <p className="mb-6 text-sm text-gray-500">All registered accounts.</p>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error   && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Paid</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <Td>
                    <span className="font-mono text-xs text-gray-700">{u.email}</span>
                  </Td>
                  <Td>{u.name ?? <span className="text-gray-400">—</span>}</Td>
                  <Td>
                    <span className={[
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      u.role === 'ADMIN'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600',
                    ].join(' ')}>
                      {u.role}
                    </span>
                  </Td>
                  <Td>
                    <span className={u.hasPaid ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {u.hasPaid ? 'Yes' : 'No'}
                    </span>
                  </Td>
                  <Td>{fmtDate(u.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-gray-700">{children}</td>
}
