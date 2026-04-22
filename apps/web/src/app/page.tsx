import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="text-lg font-bold tracking-tight">BotForge</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-32 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-4 py-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          MVP — Under active development
        </div>

        <h1 className="mb-5 text-5xl font-bold tracking-tight leading-tight sm:text-6xl">
          Build Telegram bots
          <span className="block text-indigo-400">without writing code</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-base text-gray-400 leading-relaxed">
          Pick a template, fill in a short form, and BotForge generates and deploys a
          production-ready Telegram bot for you — in minutes, not weeks.
        </p>

        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-indigo-600 px-8 py-3.5 font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Create your first bot
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-32">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: '📋',
              title: 'Choose a template',
              desc: 'Pick from production-tested bot templates built for real business use cases.',
            },
            {
              icon: '⚙️',
              title: 'Configure in minutes',
              desc: 'Fill in a simple form. No code, no YAML, no terminal required.',
            },
            {
              icon: '🚀',
              title: 'Deploy instantly',
              desc: 'We build and run your bot automatically. It goes live on Telegram immediately.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6"
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-1.5 font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
