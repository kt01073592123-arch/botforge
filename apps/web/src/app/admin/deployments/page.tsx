'use client'

import { useEffect, useState } from 'react'
import { getAdminDeployments, adminRedeploy, type AdminDeployment } from '@/lib/admin'
import { ApiError } from '@/lib/api'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLORS: Record<string, string> = {
  QUEUED:  'bg-gray-100 text-gray-600',
  RUNNING: 'bg-indigo-50 text-indigo-700',
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED:  'bg-red-50 text-red-700',
}

export default function AdminDeploymentsPage() {
  const [jobs, setJobs]         = useState<AdminDeployment[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [redeploying, setRedeploying] = useState<string | null>(null)
  const [actionMsg, setActionMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    getAdminDeployments()
      .then(setJobs)
      .catch(() => setError('Failed to load deployments.'))
      .finally(() => setLoading(false))
  }

  async function handleRedeploy(projectId: string) {
    setRedeploying(projectId)
    setActionMsg(null)
    try {
      await adminRedeploy(projectId)
      setActionMsg({ type: 'ok', text: 'Redeploy queued.' })
      // Refresh after a moment so the new job appears
      setTimeout(load, 1500)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Redeploy failed.'
      setActionMsg({ type: 'err', text: msg })
    } finally {
      setRedeploying(null)
    }
  }

  const failedCount = jobs.filter((j) => j.status === 'FAILED').length

  return (
    <div>
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">Deployments</h1>
        {failedCount > 0 && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            {failedCount} failed
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Latest 200 deployment jobs — most recent first.
      </p>

      {actionMsg && (
        <div className={[
          'mb-4 rounded-lg px-4 py-3 text-sm',
          actionMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
        ].join(' ')}>
          {actionMsg.text}
          <button
            onClick={() => setActionMsg(null)}
            className="ml-3 text-xs underline hover:no-underline"
          >
            dismiss
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error   && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <Th>Project</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>PM2</Th>
                <Th>Error</Th>
                <Th>Started</Th>
                <Th>Finished</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className={[
                    'hover:bg-gray-50',
                    job.status === 'FAILED' ? 'bg-red-50/30' : '',
                  ].join(' ')}
                >
                  <Td>
                    <span className="font-medium text-gray-900">{job.project.name}</span>
                    <br />
                    <span className="font-mono text-[11px] text-gray-400">{job.project.id}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-gray-600">{job.project.user.email}</span>
                  </Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {job.status}
                    </span>
                  </Td>
                  <Td>
                    {job.pm2Name
                      ? <code className="text-[11px] font-mono text-gray-700">{job.pm2Name}</code>
                      : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td>
                    {job.errorMsg ? (
                      <span className="block max-w-xs truncate text-xs text-red-600" title={job.errorMsg}>
                        {job.errorMsg}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-gray-500">{fmtDate(job.startedAt)}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-gray-500">{fmtDate(job.finishedAt)}</span>
                  </Td>
                  <Td>
                    {(job.status === 'FAILED' || job.status === 'SUCCESS') && (
                      <button
                        onClick={() => handleRedeploy(job.project.id)}
                        disabled={redeploying === job.project.id}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {redeploying === job.project.id ? '…' : 'Redeploy'}
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
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
  return <td className="px-4 py-3 align-top">{children}</td>
}
