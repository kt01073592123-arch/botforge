'use client'

import { useEffect, useState } from 'react'
import { generateProject, getGenerationSummary, type GenerationSummary } from '@/lib/generated'
import { ApiError } from '@/lib/api'

interface Props {
  projectId: string
  /** Called after a successful generation so the parent can update project status. */
  onGenerated: () => void
}

type PanelState =
  | { status: 'loading' }
  | { status: 'idle' }                          // no previous generation
  | { status: 'done'; summary: GenerationSummary }
  | { status: 'generating' }
  | { status: 'error'; message: string }

export default function GeneratePanel({ projectId, onGenerated }: Props) {
  const [state, setState] = useState<PanelState>({ status: 'loading' })

  useEffect(() => {
    getGenerationSummary(projectId)
      .then((summary) =>
        setState(summary ? { status: 'done', summary } : { status: 'idle' }),
      )
      .catch(() => setState({ status: 'idle' }))
  }, [projectId])

  const handleGenerate = async () => {
    setState({ status: 'generating' })
    try {
      const summary = await generateProject(projectId)
      setState({ status: 'done', summary })
      onGenerated()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Generation failed. Please try again.'
      setState({ status: 'error', message })
    }
  }

  if (state.status === 'loading') {
    return <p className="text-sm text-gray-400">Loading…</p>
  }

  return (
    <div className="space-y-4">
      {state.status === 'error' && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Previous generation result */}
      {state.status === 'done' && (
        <GenerationResult summary={state.summary} />
      )}

      {/* Generate / Regenerate button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={state.status === 'generating'}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === 'generating'
            ? 'Generating…'
            : state.status === 'done'
              ? 'Re-generate'
              : 'Generate Bot'}
        </button>

        {state.status === 'done' && (
          <span className="text-xs text-gray-400">
            v{state.summary.versionNumber} &middot; generated{' '}
            {new Date(state.summary.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {state.status === 'generating' && (
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Building source files…
        </div>
      )}
    </div>
  )
}

// ── Generation result card ────────────────────────────────────────────────────

function GenerationResult({ summary }: { summary: GenerationSummary }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
          ✓
        </span>
        <p className="text-sm font-semibold text-green-800">
          Source generated — version {summary.versionNumber}
        </p>
      </div>

      {/* File list */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-green-700">
          {summary.fileCount} files generated:
        </p>
        <ul className="space-y-1">
          {summary.filePaths.map((path) => (
            <li key={path} className="flex items-center gap-2 text-xs text-green-800">
              <span className="font-mono">{path}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Env vars */}
      {summary.envVars.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-green-700">
            Environment variables required at deploy time:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.envVars.map((v) => (
              <code
                key={v}
                className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-mono text-green-800"
              >
                {v}
              </code>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-green-600">
        Your bot source is ready. Deploy it to make it live.
      </p>
    </div>
  )
}
