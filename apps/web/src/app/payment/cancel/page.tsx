import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-20">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="mb-8 text-gray-500">
          No charge was made. You can complete your purchase any time.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="inline-flex rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Try again
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl border border-gray-200 px-8 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
