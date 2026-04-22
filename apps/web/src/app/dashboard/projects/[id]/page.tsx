'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getProjectOverview, type ProjectOverview } from '@/lib/projects'
import { generateProject } from '@/lib/generated'
import { triggerDeploy } from '@/lib/deploy'
import { ApiError } from '@/lib/api'
import { isEffectivelyPaid } from '@/lib/payments-gate'
import StatusBadge from '@/components/status-badge'
import TemplateSelector from './_components/template-selector'
import ConfigForm from './_components/config-form'
import CodePreview from './_components/code-preview'
import DeployHistory from './_components/deploy-history'
import BotActions from './_components/bot-actions'

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const POLL_MS = 3_000

// ── Page state ────────────────────────────────────────────────────────────────

type PageState =
  | { tag: 'loading' }
  | { tag: 'found'; overview: ProjectOverview }
  | { tag: 'not_found' }
  | { tag: 'error'; message: string }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('project')
  const tc = useTranslations('common')

  const [state, setState] = useState<PageState>({ tag: 'loading' })
  // Which expandable section is open: template selector or config form
  const [expandedSection, setExpandedSection] = useState<'template' | 'config' | null>(null)

  const [generating, setGenerating] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadOverview = useCallback(async () => {
    try {
      const overview = await getProjectOverview(id)
      setState({ tag: 'found', overview })

      // Auto-open the right section on first load only
      setExpandedSection((prev) => {
        if (prev !== null) return prev
        if (!overview.templateKey) return 'template'
        if (!overview.config.exists) return 'config'
        return null
      })

      // Resume deploy polling if a job is still in-progress
      const d = overview.latestDeployment
      if (d && (d.status === 'QUEUED' || d.status === 'RUNNING')) {
        setDeploying(true)
        startPoll()
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ tag: 'not_found' })
      } else {
        setState({ tag: 'error', message: t('loadError') })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadOverview()
    return () => stopPoll()
  }, [loadOverview])

  // ── Polling ───────────────────────────────────────────────────────────────

  function startPoll() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await getProjectOverview(id)
        setState({ tag: 'found', overview: fresh })
        const d = fresh.latestDeployment
        if (!d || d.status === 'SUCCESS' || d.status === 'FAILED') {
          stopPoll()
          setDeploying(false)
        }
      } catch {
        stopPoll()
        setDeploying(false)
      }
    }, POLL_MS)
  }

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // ── Actions ───��────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true)
    setActionError(null)
    try {
      await generateProject(id)
      await loadOverview()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('generateFailed'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeploy() {
    setDeploying(true)
    setActionError(null)
    try {
      await triggerDeploy(id)
      await loadOverview()
      startPoll()
    } catch (err) {
      setDeploying(false)
      setActionError(err instanceof ApiError ? err.message : t('deployFail'))
    }
  }

  // ── Render: skeleton states ────────────────────────────────────────────────

  if (state.tag === 'loading') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="py-20 text-center text-sm text-gray-400">{tc('loading')}</div>
      </main>
    )
  }

  if (state.tag === 'not_found') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-center">
        <div className="mb-3 text-4xl">🔍</div>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">{t('notFound')}</h1>
        <p className="mb-6 text-sm text-gray-500">{t('notFoundDesc')}</p>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
          {tc('backToDashboard')}
        </Link>
      </main>
    )
  }

  if (state.tag === 'error') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-center">
        <p className="text-sm text-red-600">{state.message}</p>
        <Link href="/dashboard" className="mt-4 block text-sm text-indigo-600 hover:underline">
          {tc('backToDashboard')}
        </Link>
      </main>
    )
  }

  // ── Render: main page ──────────────────────────────────────────────────────

  const { overview } = state
  const { config, generation, latestDeployment, payment } = overview

  const hasPaid       = isEffectivelyPaid(payment.hasPaid)

  const hasTemplate   = !!overview.templateKey
  const hasConfig     = config.exists
  const hasGeneration = !!generation
  const isLive        = overview.status === 'LIVE'

  const isDeployInProgress =
    latestDeployment?.status === 'QUEUED' || latestDeployment?.status === 'RUNNING'

  // Determine what's blocking each action (null = unblocked).
  // Prerequisite checks come first so the user sees actionable steps;
  // payment gate only surfaces when they're actually ready to generate/deploy.
  const generateBlock = !hasTemplate
    ? t('blockSelectTemplate')
    : !hasConfig
      ? t('blockSaveConfig')
      : !hasPaid
        ? t('blockPayGenerate')
        : null

  const deployBlock = !hasGeneration
    ? t('blockGenerateFirst')
    : !hasPaid
      ? t('blockPayDeploy')
      : null

  const canGenerate = !generateBlock && !generating
  const canDeploy   = !deployBlock && !deploying && !isDeployInProgress

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-gray-500 transition hover:text-gray-800"
      >
        {t('breadcrumb')}
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{overview.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={overview.status} />
            <span className="text-xs text-gray-400">{t('updated', { time: timeAgo(overview.updatedAt) })}</span>
          </div>
        </div>
      </div>

      {/* Payment banner — shown only after template + config are done, hidden when payments disabled */}
      {!hasPaid && hasTemplate && hasConfig && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">{t('paymentBanner')}</p>
          <Link
            href="/pricing"
            className="ml-4 shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
          >
            {t('paymentCta')}
          </Link>
        </div>
      )}

      {/* Readiness strip */}
      <ReadinessStrip
        hasTemplate={hasTemplate}
        hasConfig={hasConfig}
        hasGeneration={hasGeneration}
        isLive={isLive}
      />

      {/* Action error */}
      {actionError && (
        <div className="mb-4 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-4 shrink-0 text-xs text-red-400 underline hover:no-underline"
          >
            {tc('dismiss')}
          </button>
        </div>
      )}

      <div className="space-y-3">

        {/* ── Template ─────────────────────────────────────────────────────── */}

        <SectionCard
          dot={hasTemplate ? 'green' : 'gray'}
          title={t('template')}
          summary={hasTemplate ? overview.templateKey! : t('templateNone')}
          action={{ label: expandedSection === 'template' ? tc('close') : (hasTemplate ? t('templateChange') : t('templateSelect')), onClick: () => setExpandedSection((p) => p === 'template' ? null : 'template') }}
        >
          {expandedSection === 'template' && (
            <TemplateSelector
              projectId={overview.id}
              currentKey={overview.templateKey}
              onAssigned={(key) => {
                setState({
                  tag: 'found',
                  overview: { ...overview, templateKey: key },
                })
                setExpandedSection('config')
              }}
            />
          )}
        </SectionCard>

        {/* ── Configuration ─��──────────────────────────────────────────────── */}

        <SectionCard
          dot={hasConfig ? 'green' : hasTemplate ? 'gray' : 'blocked'}
          title={t('config')}
          summary={
            !hasTemplate
              ? t('configSelectFirst')
              : hasConfig && config.validatedAt
                ? t('configSaved', { time: timeAgo(config.validatedAt) })
                : t('configNotSaved')
          }
          action={
            hasTemplate
              ? { label: expandedSection === 'config' ? tc('close') : t('configEdit'), onClick: () => setExpandedSection((p) => p === 'config' ? null : 'config') }
              : undefined
          }
        >
          {expandedSection === 'config' && overview.templateKey && (
            <ConfigForm
              projectId={overview.id}
              templateKey={overview.templateKey}
              onSaved={loadOverview}
            />
          )}
        </SectionCard>

        {/* ── Bot Source ───────────────────────────────────────────────────── */}

        <SectionCard
          dot={hasGeneration ? 'green' : 'gray'}
          title={t('source')}
          summary={
            hasGeneration
              ? t('sourceSummary', { version: generation!.versionNumber, count: generation!.fileCount, time: timeAgo(generation!.generatedAt) })
              : generateBlock ?? t('sourceReady')
          }
        >
          {hasGeneration && generation && (
            <GenerationDetail generation={generation} />
          )}
          {hasConfig && hasTemplate && (
            <CodePreview projectId={overview.id} />
          )}
        </SectionCard>

        {/* Generate action row */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? t('generateBtnActive')
              : hasGeneration
                ? t('generateBtnRe')
                : t('generateBtn')}
          </button>
          {generateBlock && (
            <span className="text-xs text-gray-400">{generateBlock}</span>
          )}
        </div>

        {/* ── Deployment ───────────────────────────────────────────────────── */}

        <SectionCard
          dot={
            isLive
              ? 'green'
              : latestDeployment?.status === 'FAILED'
                ? 'red'
                : isDeployInProgress
                  ? 'pulse'
                  : 'gray'
          }
          title={t('deployment')}
          summary={
            isDeployInProgress
              ? latestDeployment!.status === 'QUEUED'
                ? t('deployQueued')
                : t('deployInProgress')
              : isLive
                ? `${t('deployLive')}${latestDeployment?.pm2Name ? ` · ${latestDeployment.pm2Name}` : ''}`
                : latestDeployment?.status === 'FAILED'
                  ? t('deployFailed')
                  : deployBlock ?? t('deployReady')
          }
        >
          {/* In-progress indicator */}
          {isDeployInProgress && (
            <div className="flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <div>
                <p className="text-sm font-semibold text-indigo-700">
                  {latestDeployment!.status === 'QUEUED' ? t('deployQueued') : t('deployInProgress')}
                </p>
                <p className="mt-0.5 text-xs text-indigo-500">{t('deployInProgressDesc')}</p>
              </div>
            </div>
          )}

          {/* Success card */}
          {latestDeployment?.status === 'SUCCESS' && !isDeployInProgress && (
            <div className="space-y-1 rounded-lg bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white">
                  ✓
                </span>
                <p className="text-sm font-semibold text-green-800">{t('deployBotLive')}</p>
              </div>
              {latestDeployment.pm2Name && (
                <p className="text-xs text-green-700">
                  {t('deployPm2')}{' '}
                  <code className="font-mono">{latestDeployment.pm2Name}</code>
                </p>
              )}
              {latestDeployment.finishedAt && (
                <p className="text-xs text-green-600">
                  {t('deployDeployed', { time: fmtDate(latestDeployment.finishedAt) })}
                </p>
              )}
            </div>
          )}

          {/* Failed card */}
          {latestDeployment?.status === 'FAILED' && !isDeployInProgress && (
            <div className="space-y-1 rounded-lg bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                  ✕
                </span>
                <p className="text-sm font-semibold text-red-800">{t('deployFailedTitle')}</p>
              </div>
              {latestDeployment.errorMessage && (
                <p className="text-xs leading-relaxed text-red-700">
                  {latestDeployment.errorMessage}
                </p>
              )}
            </div>
          )}

          {/* Deploy history */}
          {hasGeneration && <DeployHistory projectId={overview.id} />}
        </SectionCard>

        {/* Deploy action row */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeploy}
            disabled={!canDeploy}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deploying || isDeployInProgress
              ? t('deployBtnActive')
              : latestDeployment?.status === 'SUCCESS'
                ? t('deployBtnRedeploy')
                : latestDeployment?.status === 'FAILED'
                  ? t('deployBtnRetry')
                  : t('deployBtn')}
          </button>
          {deployBlock && (
            <span className="text-xs text-gray-400">{deployBlock}</span>
          )}
        </div>

        {/* Bot actions (stop) */}
        <BotActions projectId={overview.id} projectName={overview.name} status={overview.status} onAction={loadOverview} />

      </div>
    </main>
  )
}

// ── Readiness strip ───────────────────────────────────────────────────────────

function ReadinessStrip({
  hasTemplate, hasConfig, hasGeneration, isLive,
}: {
  hasTemplate: boolean
  hasConfig: boolean
  hasGeneration: boolean
  isLive: boolean
}) {
  const t = useTranslations('project')
  const steps = [
    { label: t('stepTemplate'), done: hasTemplate },
    { label: t('stepConfig'),   done: hasConfig },
    { label: t('stepSource'),   done: hasGeneration },
    { label: t('stepLive'),     done: isLive },
  ]
  return (
    <div className="mb-6 flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-5 py-3">
      {steps.map(({ label, done }, i) => (
        <Fragment key={label}>
          {i > 0 && <span className="mx-2 text-xs text-gray-200">→</span>}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${done ? 'text-green-500' : 'text-gray-300'}`}>●</span>
            <span className={`text-xs font-medium ${done ? 'text-gray-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

type DotColor = 'green' | 'gray' | 'red' | 'pulse' | 'blocked'

const DOT_CLASSES: Record<DotColor, string> = {
  green:   'bg-green-500',
  gray:    'bg-gray-300',
  red:     'bg-red-500',
  pulse:   'bg-indigo-500 animate-pulse',
  blocked: 'bg-gray-100',
}

function SectionCard({
  dot,
  title,
  summary,
  action,
  children,
}: {
  dot: DotColor
  title: string
  summary: string
  action?: { label: string; onClick: () => void }
  children?: React.ReactNode
}) {
  const hasBody = children != null && children !== false

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[dot]}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-0.5 truncate text-xs text-gray-500">{summary}</p>
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="ml-4 shrink-0 text-xs font-medium text-indigo-600 transition hover:text-indigo-800"
          >
            {action.label}
          </button>
        )}
      </div>
      {hasBody && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Generation detail ─────────────────────────────────────────────────────────

function GenerationDetail({
  generation,
}: {
  generation: NonNullable<ProjectOverview['generation']>
}) {
  const t = useTranslations('project')
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="font-medium">v{generation.versionNumber}</span>
        <span>{generation.fileCount} files</span>
        <span>Generated {fmtDate(generation.generatedAt)}</span>
      </div>

      {/* File paths */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">{t('sourceFiles')}</p>
        <div className="flex flex-wrap gap-1.5">
          {generation.filePaths.map((p) => (
            <code
              key={p}
              className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-700"
            >
              {p}
            </code>
          ))}
        </div>
      </div>

      {/* Env vars */}
      {generation.envVars.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-500">{t('sourceEnvVars')}</p>
          <div className="flex flex-wrap gap-1.5">
            {generation.envVars.map((v) => (
              <code
                key={v}
                className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-mono text-indigo-700"
              >
                {v}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
