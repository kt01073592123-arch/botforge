'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProject } from '@/lib/projects'
import { ApiError } from '@/lib/api'

export default function NewProjectPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const project = await createProject({ name: name.trim() })
      router.push(`/dashboard/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 transition hover:text-gray-800"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Create a new bot</h1>
        <p className="mb-6 text-sm text-gray-500">
          Give your project a name to get started. You&apos;ll configure the bot in the next step.
        </p>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Project name
            </label>
            <input
              id="name"
              type="text"
              required
              autoFocus
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. My Support Bot"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
