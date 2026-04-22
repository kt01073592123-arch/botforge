import { apiFetch } from './api'

export interface PaymentStatus {
  hasPaid: boolean
}

export async function getPaymentStatus(): Promise<PaymentStatus> {
  return apiFetch<PaymentStatus>('/payments/me')
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/payments/checkout-session', {
    method: 'POST',
  })
}
