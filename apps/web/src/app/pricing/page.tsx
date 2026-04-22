'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCheckoutSession } from '@/lib/payments'

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const { url } = await createCheckoutSession()
      router.push(url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-20">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="mb-4 inline-block rounded-full bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-600">
            One-time payment
          </span>
          <h1 className="text-4xl font-bold text-gray-900">$9.99</h1>
          <p className="mt-2 text-gray-500">Lifetime access — no subscriptions, no renewals</p>
        </div>

        {/* Feature list */}
        <ul className="mb-8 space-y-3 text-sm text-gray-700">
          {[
            'Unlimited bot projects',
            'Deploy to your own server via PM2',
            'All current and future templates',
            'Source code you fully own',
            'No monthly fees, ever',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? 'Redirecting to checkout…' : 'Get lifetime access →'}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          Secure checkout powered by Stripe. Your card details never touch our servers.
        </p>
      </div>
    </main>
  )
}
