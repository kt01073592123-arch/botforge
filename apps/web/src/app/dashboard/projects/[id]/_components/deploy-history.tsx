'use client'

import { useEffect, useState } from 'react'
import { getDeployHistory, type DeploymentSummary } from '@/lib/deploy'

interface Props {
  projectId: string
}

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  SUCCESS: { dot: 'bg-green-500', text: 'text-green-700' },
  FAILED:  { dot: 'bg-red-500',   text: 'text-red-700' },
  RUNNING: { dot: 'bg-indigo-500 animate-pulse', text: 'text-indigo-700' },
  QUEUED:  { dot: 'bg-gray-400',  text: 'text-gray-600' },
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString('uz', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function DeployHistory({ projectId }: Props) {
  const [deploys, setDeploys] = useState<DeploymentSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeployHistory(projectId)
      .then(setDeploys)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <p className="text-sm text-gray-400">Yuklanmoqda...</p>
  if (deploys.length === 0) return <p className="text-sm text-gray-500">Hali deploy qilinmagan</p>

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500">Deploy tarixi</p>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {deploys.map((d) => {
          const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.QUEUED
          return (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2">
              <div className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <span className={`text-xs font-medium ${style.text}`}>
                {d.status}
              </span>
              {d.pm2Name && (
                <code className="text-[10px] font-mono text-gray-400">{d.pm2Name}</code>
              )}
              <span className="ml-auto text-[10px] text-gray-400">
                {fmtShort(d.createdAt)}
              </span>
              {d.errorMessage && (
                <span className="max-w-[200px] truncate text-[10px] text-red-500" title={d.errorMessage}>
                  {d.errorMessage}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
