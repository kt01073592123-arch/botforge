'use client'

import { useEffect, useState } from 'react'
import { getAdminProjects, type AdminProject } from '@/lib/admin'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-600',
  CONFIGURED: 'bg-blue-50 text-blue-700',
  GENERATED:  'bg-indigo-100 text-indigo-800',
  DEPLOYING:  'bg-purple-50 text-purple-700',
  LIVE:       'bg-green-100 text-green-700',
  FAILED:     'bg-red-50 text-red-600',
  ARCHIVED:   'bg-gray-50 text-gray-400',
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    getAdminProjects()
      .then(setProjects)
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Projects</h1>
      <p className="mb-6 text-sm text-gray-500">All bot projects across all users.</p>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error   && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <Th>Project</Th>
                <Th>Owner</Th>
                <Th>Template</Th>
                <Th>Status</Th>
                <Th>Config</Th>
                <Th>Source</Th>
                <Th>Last deploy</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => {
                const latestDeploy = p.deployments[0] ?? null
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <br />
                      <span className="font-mono text-[11px] text-gray-400">{p.id}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-600">{p.user.email}</span>
                    </Td>
                    <Td>
                      {p.templateKey
                        ? <span className="font-mono text-xs text-gray-700">{p.templateKey}</span>
                        : <span className="text-gray-400">—</span>}
                    </Td>
                    <Td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </Td>
                    <Td>
                      <span className={p.config ? 'text-green-600' : 'text-gray-300'}>●</span>
                    </Td>
                    <Td>
                      {p.generatedVersion
                        ? <span className="text-green-600">v{p.generatedVersion.versionNumber}</span>
                        : <span className="text-gray-300">—</span>}
                    </Td>
                    <Td>
                      {latestDeploy ? (
                        <span className={[
                          'text-xs font-medium',
                          latestDeploy.status === 'SUCCESS' ? 'text-green-600'
                            : latestDeploy.status === 'FAILED' ? 'text-red-500'
                              : 'text-indigo-500',
                        ].join(' ')}>
                          {latestDeploy.status}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-500">{timeAgo(p.updatedAt)}</span>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
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
  return <td className="px-4 py-3">{children}</td>
}
