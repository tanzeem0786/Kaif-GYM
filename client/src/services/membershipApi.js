import { apiClient } from './apiClient.js'

export async function listMembershipPlans(params, options = {}) {
  const { data } = await apiClient.get('/membership-plans', {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function createMembershipPlan(input) {
  const { data } = await apiClient.post('/membership-plans', input)
  return data.data.plan
}

export async function getMembershipPlan(planId, options = {}) {
  const { data } = await apiClient.get(`/membership-plans/${planId}`, {
    signal: options.signal,
  })
  return data.data.plan
}

export async function updateMembershipPlan(planId, input) {
  const { data } = await apiClient.patch(`/membership-plans/${planId}`, input)
  return data.data.plan
}

export async function updateMembershipPlanStatus(planId, isActive) {
  const { data } = await apiClient.patch(`/membership-plans/${planId}/status`, { isActive })
  return data.data.plan
}

export async function listMemberships(params, options = {}) {
  const { data } = await apiClient.get('/memberships', {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function createMembership(input) {
  const { data } = await apiClient.post('/memberships', input)
  return data.data.membership
}

export async function getMembership(membershipId, options = {}) {
  const { data } = await apiClient.get(`/memberships/${membershipId}`, {
    signal: options.signal,
  })
  return data.data.membership
}

export async function renewMembership(membershipId, input) {
  const { data } = await apiClient.post(`/memberships/${membershipId}/renew`, input)
  return data.data.membership
}

export async function getMembershipSummary(options = {}) {
  const { data } = await apiClient.get('/memberships/summary', {
    signal: options.signal,
  })
  return data.data
}
