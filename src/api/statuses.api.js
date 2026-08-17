import apiClient from './axios'
import { createCachedRequest } from './cachedRequest'

const statusesRequest = createCachedRequest(() => apiClient.get('/statuses'))

export function getStatuses(options) {
  return statusesRequest.get(options)
}

export function clearStatusesCache() {
  statusesRequest.clear()
}

export async function updateStatus(id, payload) {
  const response = await apiClient.patch(`/statuses/${id}`, payload)
  clearStatusesCache()

  return response
}
