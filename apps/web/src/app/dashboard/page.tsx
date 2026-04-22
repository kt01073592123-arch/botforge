'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listProjects, type Project } from '@/lib/projects'
import { getPaymentStatus } from '@/lib/payments'
import { isEffectivelyPaid } from '@/lib/payments-gate'
import StatusBadge from '@/components/status-badge'

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const DEPLOY_LABEL: Record<string, string> = {
  QUEUED:  'Queued',
  RUNNING: 'Deploying',
  SUCCESS: 'Live',
  FAILED:  'Deploy failed',
}

const DEPLOY_COLOR: Record<string, string> = {
  QUEUED:  'text-indigo-500',
  RUNNING: 'text-indigo-600',
  SUCCESS: 'text-green-600',
  FAILED:  'text-red-500',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPaid, setHasPaid] = useState<boolean | null>(null)

  useEffect(() => {
    Promise.all([listProjects(), getPaymentStatus()])
      .then(([projectList, paymentStatus]) => {
        setProjects(projectList)
        setHasPaid(isEffectivelyPaid(paymentStatus.hasPaid))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {hasPaid === false && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-amber-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm font-medium text-amber-800">
              Unlock full access to generate and deploy your bots
            </p>
          </div>
          <Link
            href="/pricing"
            className="ml-4 shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
          >
            Get access →
          </Link>
        </div>
      )}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bots</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your Telegram bot projects</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          + New bot
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading…</div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <ProjectList projects={projects} />
      )}
    </main>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
      <div className="mb-3 text-5xl">🤖</div>
      <h3 className="mb-1 text-base font-semibold text-gray-900">No bots yet</h3>
      <p className="mb-6 text-sm text-gray-500">
        Create your first Telegram bot in a few minutes
      </p>
      <Link
        href="/dashboard/projects/new"
        className="inline-flex rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Create your first bot
      </Link>
    </div>
  )
}

// ── Project list ──────────────────────────────────────────────────────────────

function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </div>
  )
}

function ProjectRow({ project }: { project: Project }) {
  const latestDeploy = project.deployments?.[0]

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="flex items-center gap-4 px-6 py-4 transition hover:bg-gray-50"
    >
      {/* Icon + name + template */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xl">
          🤖
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{project.name}</p>
          <p className="text-xs text-gray-400">
            {project.templateKey ?? 'No template selected'}
          </p>
        </div>
      </div>

      {/* Completion indicators (hidden on mobile) */}
      <div className="hidden items-center gap-4 sm:flex">
        <Dot active={!!project.config} label="Config" />
        <Dot
          active={!!project.generatedVersion}
          label={project.generatedVersion ? `v${project.generatedVersion.versionNumber}` : 'Source'}
        />
        {latestDeploy && (
          <span className={`text-xs font-medium ${DEPLOY_COLOR[latestDeploy.status] ?? 'text-gray-500'}`}>
            {DEPLOY_LABEL[latestDeploy.status] ?? latestDeploy.status}
          </span>
        )}
      </div>

      {/* Status + updated */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={project.status} />
        <span className="text-[11px] text-gray-400">{timeAgo(project.updatedAt)}</span>
      </div>
    </Link>
  )
}

function Dot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={active ? 'text-green-500' : 'text-gray-300'}>●</span>
      <span className={active ? 'text-gray-600' : 'text-gray-400'}>{label}</span>
    </div>
  )
}
