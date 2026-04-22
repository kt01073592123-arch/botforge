import Link from 'next/link'

const SECTIONS = [
  {
    href:        '/admin/users',
    title:       'Users',
    description: 'View all accounts, payment status, and roles.',
    color:       'bg-blue-50 text-blue-600',
  },
  {
    href:        '/admin/projects',
    title:       'Projects',
    description: 'Inspect all bot projects — template, config, generation, and deploy state.',
    color:       'bg-indigo-50 text-indigo-600',
  },
  {
    href:        '/admin/payments',
    title:       'Payments',
    description: 'Review Stripe payment records and confirm paid status.',
    color:       'bg-green-50 text-green-600',
  },
  {
    href:        '/admin/deployments',
    title:       'Deployments',
    description: 'Monitor deployment jobs, inspect failures, and trigger redeployments.',
    color:       'bg-amber-50 text-amber-600',
  },
]

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Admin Overview</h1>
      <p className="mb-8 text-sm text-gray-500">
        Internal tooling — for operator use only.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ href, title, description, color }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <div className={`mb-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${color}`}>
              {title}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
