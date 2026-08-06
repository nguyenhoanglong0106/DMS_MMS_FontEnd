import apiClient from './axios'

// Gọi API lấy danh sách trạng thái kết nối (Online/Offline) và màu hiển thị.
export function getMachineConnectionStatuses() {
  return apiClient.get('/machine-connection-statuses')
}

// Gọi API cập nhật tên/màu của 1 trạng thái kết nối.
export function updateMachineConnectionStatus(id, payload) {
  return apiClient.patch(`/machine-connection-statuses/${id}`, payload)
}
