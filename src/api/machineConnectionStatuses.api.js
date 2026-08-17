import apiClient from './axios'
import { createCachedRequest } from './cachedRequest'

const machineConnectionStatusesRequest = createCachedRequest(() => apiClient.get('/machine-connection-statuses'))

export function getMachineConnectionStatuses(options) {
  return machineConnectionStatusesRequest.get(options)
}

export function clearMachineConnectionStatusesCache() {
  machineConnectionStatusesRequest.clear()
}

export async function updateMachineConnectionStatus(id, payload) {
  const response = await apiClient.patch(`/machine-connection-statuses/${id}`, payload)
  clearMachineConnectionStatusesCache()

  return response
}
