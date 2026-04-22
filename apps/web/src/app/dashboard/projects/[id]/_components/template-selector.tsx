'use client'

import { useEffect, useState } from 'react'
import { listTemplates, type TemplateMetadata } from '@/lib/templates'
import { assignTemplate } from '@/lib/projects'
import { ApiError } from '@/lib/api'

const TEMPLATE_ICONS: Record<string, string> = {
  'lead-capture-bot': '📬',
  'order-bot': '🛒',
  'booking-bot': '📅',
  'support-bot': '🛟',
  'faq-bot': '❓',
  'ai-consultant-bot': '🤖',
}

interface Props {
  projectId: string
  currentKey: string | null
  onAssigned: (templateKey: string) => void
}

export default function TemplateSelector({ projectId, currentKey, onAssigned }: Props) {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => setError('Failed to load templates.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (key: string) => {
    if (key === currentKey || assigning) return
    setAssigning(key)
    setError('')
    try {
      await assignTemplate(projectId, key)
      onAssigned(key)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign template.')
    } finally {
      setAssigning(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading templates…</p>
  }

  if (error && templates.length === 0) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((tpl) => {
          const isSelected = tpl.key === currentKey
          const isLoading = assigning === tpl.key

          return (
            <button
              key={tpl.key}
              onClick={() => handleSelect(tpl.key)}
              disabled={!!assigning}
              className={[
                'relative flex flex-col items-start rounded-xl border p-4 text-left transition',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40',
                assigning && !isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] text-white font-bold">
                  ✓
                </span>
              )}
              <div className="mb-1.5 text-2xl">{TEMPLATE_ICONS[tpl.key] ?? '🤖'}</div>
              <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{tpl.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {tpl.category}
                </span>
                {tpl.isPaid ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    ${(tpl.priceUsd / 100).toFixed(0)}
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    Free
                  </span>
                )}
              </div>
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 text-sm text-indigo-600 font-medium">
                  Selecting…
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
