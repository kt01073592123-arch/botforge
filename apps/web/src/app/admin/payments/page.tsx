'use client'

import { useEffect, useState } from 'react'
import { getAdminPayments, type AdminPayment } from '@/lib/admin'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtAmount(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-gray-100 text-gray-600',
  PAID:     'bg-green-100 text-green-700',
  FAILED:   'bg-red-50 text-red-600',
  REFUNDED: 'bg-amber-50 text-amber-700',
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    getAdminPayments()
      .then(setPayments)
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false))
  }, [])

  const totalPaid = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amountCents, 0)

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Payments</h1>
      <p className="mb-6 text-sm text-gray-500">Stripe payment records.</p>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error   && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {/* Summary strip */}
          <div className="mb-4 flex gap-4">
            <SummaryCard
              label="Total confirmed revenue"
              value={fmtAmount(totalPaid, 'usd')}
              color="text-green-700"
            />
            <SummaryCard
              label="Paid records"
              value={String(payments.filter((p) => p.status === 'PAID').length)}
              color="text-indigo-700"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                  <Th>User</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Session ID</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>
                      <span className="text-xs text-gray-700">{p.user.email}</span>
                    </Td>
                    <Td>
                      <span className="font-medium text-gray-900">
                        {fmtAmount(p.amountCents, p.currency)}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11px] text-gray-500">
                        {p.stripeSessionId.slice(0, 24)}…
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-500">{fmtDate(p.createdAt)}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
              {payments.length} record{payments.length !== 1 ? 's' : ''}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>
}
