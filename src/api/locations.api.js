import apiClient from './axios'
import { createCachedRequest } from './cachedRequest'

const locationsRequest = createCachedRequest(() => apiClient.get('/locations'))

export function getLocations(options) {
  return locationsRequest.get(options)
}

export function clearLocationsCache() {
  locationsRequest.clear()
}

export async function createLocation(payload) {
  const response = await apiClient.post('/locations', payload)
  clearLocationsCache()

  return response
}

export async function updateLocation(id, payload) {
  const response = await apiClient.patch(`/locations/${id}`, payload)
  clearLocationsCache()

  return response
}

export async function deleteLocation(id) {
  const response = await apiClient.delete(`/locations/${id}`)
  clearLocationsCache()

  return response
}
