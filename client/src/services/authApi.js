import { apiClient } from './apiClient.js'

export async function loginAdmin(credentials) {
  const { data } = await apiClient.post('/auth/login', credentials)
  return data.data.admin
}

export async function logoutAdmin() {
  await apiClient.post('/auth/logout')
}

export async function getCurrentAdmin(options = {}) {
  const { data } = await apiClient.get('/auth/me', { signal: options.signal })
  return data.data.admin
}
