import { apiClient } from './apiClient.js'

export async function listMembers(params, options = {}) {
  const { data } = await apiClient.get('/members', {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function createMember(member) {
  const { data } = await apiClient.post('/members', member)
  return data.data.member
}

export async function getMember(memberId, options = {}) {
  const { data } = await apiClient.get(`/members/${memberId}`, {
    signal: options.signal,
  })
  return data.data.member
}

export async function updateMember(memberId, member) {
  const { data } = await apiClient.patch(`/members/${memberId}`, member)
  return data.data.member
}

export async function updateMemberStatus(memberId, status) {
  const { data } = await apiClient.patch(`/members/${memberId}/status`, { status })
  return data.data.member
}
