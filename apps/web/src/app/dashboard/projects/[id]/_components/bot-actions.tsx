'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { stopBot } from '@/lib/deploy'
import { renameProject, deleteProject } from '@/lib/projects'
import { ApiError } from '@/lib/api'

interface Props {
  projectId: string
  projectName: string
  status: string
  onAction: () => void
}

export default function BotActions({ projectId, projectName, status, onAction }: Props) {
  const router = useRouter()
  const [stopping, setStopping] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newName, setNewName] = useState(projectName)
  const [error, setError] = useState('')

  const isLive = status === 'LIVE'

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

  async function handleRename() {
    if (!newName.trim() || newName.trim() === projectName) {
      setShowRename(false)
      return
    }
    setRenaming(true)
    setError('')
    try {
      await renameProject(projectId, newName.trim())
      setShowRename(false)
      onAction()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nomni o'zgartirishda xatolik")
    } finally {
      setRenaming(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      // If bot is live, stop it first
      if (isLive) {
        await stopBot(projectId).catch(() => {})
      }
      await deleteProject(projectId)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "O'chirishda xatolik")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
      )}

      {/* Rename form */}
      {showRename && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            onClick={handleRename}
            disabled={renaming}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {renaming ? '...' : 'Saqlash'}
          </button>
          <button
            onClick={() => { setShowRename(false); setNewName(projectName) }}
            className="rounded px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            Bekor
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="mb-3 text-sm text-red-800">
            <strong>&quot;{projectName}&quot;</strong> loyihasini o&apos;chirmoqchimisiz? Bu amalni qaytarib bo&apos;lmaydi. Barcha sozlamalar, kod va deploy tarixi o&apos;chiriladi.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isLive && (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {stopping ? "To'xtatilmoqda..." : "To'xtatish"}
          </button>
        )}
        {!showRename && (
          <button
            onClick={() => setShowRename(true)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Nomini o&apos;zgartirish
          </button>
        )}
        {!showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-400 transition hover:border-red-200 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            O&apos;chirish
          </button>
        )}
      </div>
    </div>
  )
}
