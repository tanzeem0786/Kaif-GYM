import { apiClient } from './apiClient.js'

export async function listTrainerCommissionAgreements(trainerId, params = {}, options = {}) {
  const { data } = await apiClient.get(
    `/commission-agreements/trainers/${trainerId}`,
    { params, signal: options.signal },
  )
  return data.data
}

export async function createTrainerCommissionAgreement(trainerId, input) {
  const { data } = await apiClient.post(
    `/commission-agreements/trainers/${trainerId}`,
    input,
  )
  return data.data.agreement
}

export async function getCommissionAgreement(agreementId, options = {}) {
  const { data } = await apiClient.get(`/commission-agreements/${agreementId}`, {
    signal: options.signal,
  })
  return data.data.agreement
}
