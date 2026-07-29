import apiClient from './axios'

// Gọi API lấy danh sách trạng thái máy.
export function getStatuses() {
  return apiClient.get('/statuses')
}

// Gọi API cập nhật trạng thái.
export function updateStatus(id, payload) {
  return apiClient.patch(`/statuses/${id}`, payload)
}
