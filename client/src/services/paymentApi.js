import { apiClient } from './apiClient.js'

export async function listPayments(params, options = {}) {
  const { data } = await apiClient.get('/payments', { params, signal: options.signal })
  return data.data
}

export async function listMemberPayments(memberId, params = {}, options = {}) {
  const { data } = await apiClient.get(`/payments/member/${memberId}`, {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function createPayment(input) {
  const { data } = await apiClient.post('/payments', input)
  return data.data.payment
}

export async function getPayment(paymentId, options = {}) {
  const { data } = await apiClient.get(`/payments/${paymentId}`, {
    signal: options.signal,
  })
  return data.data
}

export async function reversePayment(paymentId, input) {
  const { data } = await apiClient.post(`/payments/${paymentId}/reversals`, input)
  return data.data.payment
}

export async function getPaymentReceipt(paymentId, options = {}) {
  const { data } = await apiClient.get(`/payments/${paymentId}/receipt`, {
    signal: options.signal,
  })
  return data.data
}
