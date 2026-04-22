/**
 * Single source of truth for frontend payment gating.
 *
 * When NEXT_PUBLIC_DISABLE_PAYMENTS=true the user is treated as paid
 * regardless of the API response. All UI that checks payment status
 * should call this instead of reading payment.hasPaid directly.
 *
 * To re-enable payments: remove the env var or set it to any other value.
 */

const paymentsDisabled = process.env.NEXT_PUBLIC_DISABLE_PAYMENTS === 'true'

export function isEffectivelyPaid(apiHasPaid: boolean): boolean {
  return apiHasPaid || paymentsDisabled
}
