'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { triggerDeploy, getDeployStatus, type DeploymentSummary } from '@/lib/deploy'
import { ApiError } from '@/lib/api'

interface Props {
  projectId: string
  /** Called with the new project status after a deploy is triggered. */
  onStatusChange: (status: string) => void
}

type PanelState =
  | { status: 'loading' }
  | { status: 'idle' }
  | { status: 'deploying'; job: DeploymentSummary }
  | { status: 'done'; job: DeploymentSummary }
  | { status: 'error'; message: string; job?: DeploymentSummary }

const POLL_INTERVAL_MS = 3000

export default function DeployPanel({ projectId, onStatusChange }: Props) {
  const [state, setState] = useState<PanelState>({ status: 'loading' })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const applyJobState = useCallback(
    (job: DeploymentSummary) => {
      if (job.status === 'QUEUED' || job.status === 'RUNNING') {
        setState({ status: 'deploying', job })
        onStatusChange('DEPLOYING')
      } else if (job.status === 'SUCCESS') {
        setState({ status: 'done', job })
        onStatusChange('LIVE')
        stopPolling()
      } else if (job.status === 'FAILED') {
        setState({
          status: 'error',
          message: job.errorMessage ?? 'Deployment failed.',
          job,
        })
        onStatusChange('FAILED')
        stopPolling()
      }
    },
    [onStatusChange],
  )

  // Load existing deploy status on mount
  useEffect(() => {
    getDeployStatus(projectId)
      .then((job) => {
        if (!job) {
          setState({ status: 'idle' })
          return
        }
        applyJobState(job)

        // If still in-progress, start polling
        if (job.status === 'QUEUED' || job.status === 'RUNNING') {
          pollRef.current = setInterval(async () => {
            const fresh = await getDeployStatus(projectId).catch(() => null)
            if (fresh) applyJobState(fresh)
          }, POLL_INTERVAL_MS)
        }
      })
      .catch(() => setState({ status: 'idle' }))

    return stopPolling
  }, [projectId, applyJobState])

  const handleDeploy = async () => {
    setState({ status: 'deploying', job: { id: '', status: 'QUEUED', pm2Name: null, errorMessage: null, startedAt: null, finishedAt: null, createdAt: new Date().toISOString() } })

    try {
      const job = await triggerDeploy(projectId)
      applyJobState(job)

      // Start polling for completion
      pollRef.current = setInterval(async () => {
        const fresh = await getDeployStatus(projectId).catch(() => null)
        if (fresh) applyJobState(fresh)
      }, POLL_INTERVAL_MS)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to start deployment.'
      setState({ status: 'error', message })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return <p className="text-sm text-gray-400">Loading…</p>
  }

  const isInProgress =
    state.status === 'deploying' &&
    (state.job.status === 'QUEUED' || state.job.status === 'RUNNING')

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {state.status === 'error' && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Existing deployment result */}
      {(state.status === 'done' || (state.status === 'error' && state.job)) && (
        <DeployResult job={(state as any).job} />
      )}

      {/* In-progress indicator */}
      {isInProgress && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                {state.job.status === 'QUEUED' ? 'Queued…' : 'Deploying…'}
              </p>
              <p className="mt-0.5 text-xs text-indigo-500">
                Installing dependencies, building, and starting bot process
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deploy / Redeploy button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleDeploy}
          disabled={isInProgress}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isInProgress
            ? 'Deploying…'
            : state.status === 'done'
              ? 'Redeploy'
              : 'Deploy Bot'}
        </button>

        {state.status === 'done' && state.job.finishedAt && (
          <span className="text-xs text-gray-400">
            Last deployed {new Date(state.job.finishedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Deployment result card ─────────────────────────────────────────────────────

function DeployResult({ job }: { job: DeploymentSummary }) {
  const isLive = job.status === 'SUCCESS'

  return (
    <div
      className={[
        'rounded-xl border p-4 space-y-2',
        isLive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
            isLive ? 'bg-green-500' : 'bg-red-500',
          ].join(' ')}
        >
          {isLive ? '✓' : '✕'}
        </span>
        <p
          className={[
            'text-sm font-semibold',
            isLive ? 'text-green-800' : 'text-red-800',
          ].join(' ')}
        >
          {isLive ? 'Bot is live' : 'Deployment failed'}
        </p>
      </div>

      {isLive && job.pm2Name && (
        <p className="text-xs text-green-700">
          Process name: <code className="font-mono">{job.pm2Name}</code>
        </p>
      )}

      {!isLive && job.errorMessage && (
        <p className="text-xs text-red-700 leading-relaxed">{job.errorMessage}</p>
      )}
    </div>
  )
}
