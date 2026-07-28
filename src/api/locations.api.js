import apiClient from './axios'

// Gọi API lấy danh sách khu vực.
export function getLocations() {
  return apiClient.get('/locations')
}

// Gọi API tạo khu vực mới.
export function createLocation(payload) {
  return apiClient.post('/locations', payload)
}

// Gọi API cập nhật khu vực.
export function updateLocation(id, payload) {
  return apiClient.patch(`/locations/${id}`, payload)
}

// Gọi API xóa khu vực.
export function deleteLocation(id) {
  return apiClient.delete(`/locations/${id}`)
}
