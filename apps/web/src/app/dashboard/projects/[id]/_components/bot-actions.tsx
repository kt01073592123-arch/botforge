'use client'

import { useState } from 'react'
import { stopBot } from '@/lib/deploy'
import { ApiError } from '@/lib/api'

interface Props {
  projectId: string
  status: string
  onAction: () => void
}

export default function BotActions({ projectId, status, onAction }: Props) {
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState('')

  const isLive = status === 'LIVE'
  const isFailed = status === 'FAILED'

  if (!isLive && !isFailed) return null

  async function handleStop() {
    setStopping(true)
    setError('')
    try {
      await stopBot(projectId)
      onAction()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "To'xtatishda xatolik")
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {isLive && (
        <button
          onClick={handleStop}
          disabled={stopping}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          {stopping ? "To'xtatilmoqda..." : "Botni to'xtatish"}
        </button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
