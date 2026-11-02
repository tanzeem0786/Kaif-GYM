import { apiClient } from './apiClient.js'

export async function listTrainers(params, options = {}) {
  const { data } = await apiClient.get('/trainers', { params, signal: options.signal })
  return data.data
}

export async function createTrainer(input) {
  const { data } = await apiClient.post('/trainers', input)
  return data.data.trainer
}

export async function getTrainer(trainerId, options = {}) {
  const { data } = await apiClient.get(`/trainers/${trainerId}`, {
    signal: options.signal,
  })
  return data.data.trainer
}

export async function updateTrainer(trainerId, input) {
  const { data } = await apiClient.patch(`/trainers/${trainerId}`, input)
  return data.data.trainer
}

export async function updateTrainerStatus(trainerId, status) {
  const { data } = await apiClient.patch(`/trainers/${trainerId}/status`, { status })
  return data.data.trainer
}

export async function listAssignments(params, options = {}) {
  const { data } = await apiClient.get('/trainer-assignments', {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function listMemberAssignments(memberId, params = {}, options = {}) {
  const { data } = await apiClient.get(`/trainer-assignments/member/${memberId}`, {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function listTrainerAssignments(trainerId, params = {}, options = {}) {
  const { data } = await apiClient.get(`/trainer-assignments/trainer/${trainerId}`, {
    params,
    signal: options.signal,
  })
  return data.data
}

export async function createAssignment(input) {
  const { data } = await apiClient.post('/trainer-assignments', input)
  return data.data.assignment
}

export async function endAssignment(assignmentId, endDate) {
  const { data } = await apiClient.patch(`/trainer-assignments/${assignmentId}/end`, {
    endDate,
  })
  return data.data.assignment
}
