import apiClient from './axios'

// Gọi API lấy danh sách trạng thái máy.
export function getStatuses() {
  return apiClient.get('/statuses')
}

// Gọi API tạo trạng thái mới.
export function createStatus(payload) {
  return apiClient.post('/statuses', payload)
}

// Gọi API cập nhật trạng thái.
export function updateStatus(id, payload) {
  return apiClient.patch(`/statuses/${id}`, payload)
}

// Gọi API xóa trạng thái.
export function deleteStatus(id) {
  return apiClient.delete(`/statuses/${id}`)
}
