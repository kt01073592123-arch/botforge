import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Create Bot' }

export default function CreateBotPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Create new bot</span>
        </div>
      </header>

      {/* Placeholder — replaced by multi-step wizard in Step 8 */}
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="rounded-xl border border-gray-200 bg-white p-10">
          <div className="mb-4 text-5xl">🚧</div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">Bot wizard coming soon</h2>
          <p className="text-sm text-gray-500">
            The multi-step creation wizard is being implemented in Step 8.
          </p>
        </div>
      </main>
    </div>
  )
}
