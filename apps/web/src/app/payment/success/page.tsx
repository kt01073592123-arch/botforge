import Link from 'next/link'

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-20">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg
            className="h-8 w-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Payment successful!</h1>
        <p className="mb-8 text-gray-500">
          You now have lifetime access to BotForge. Start building your first Telegram bot.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Go to dashboard →
        </Link>
      </div>
    </main>
  )
}
