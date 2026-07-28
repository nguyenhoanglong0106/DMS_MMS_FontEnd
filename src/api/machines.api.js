import apiClient from './axios'

// Loại bỏ query param rỗng để backend không nhận filter không cần thiết.
function buildMachineQuery(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
}

// Gọi API lấy danh sách máy kèm phân trang/filter.
export function getMachines(params = {}) {
  return apiClient.get('/machines', { params: buildMachineQuery(params) })
}

// Gọi API lấy chi tiết một máy.
export function getMachineById(id) {
  return apiClient.get(`/machines/${id}`)
}

// Gọi API tạo máy mới.
export function createMachine(payload) {
  return apiClient.post('/machines', payload)
}

// Gọi API cập nhật máy.
export function updateMachine(id, payload) {
  return apiClient.patch(`/machines/${id}`, payload)
}

// Gọi API xóa máy.
export function deleteMachine(id) {
  return apiClient.delete(`/machines/${id}`)
}

// Gọi API lấy log tín hiệu của máy.
export function getMachineLogs(id, params = {}) {
  return apiClient.get(`/machines/${id}/logs`, { params })
}

// Gọi API lấy lịch sử đổi trạng thái của máy.
export function getMachineStatusHistory(id, params = {}) {
  return apiClient.get(`/machines/${id}/status-history`, { params })
}

// Gọi API lấy dữ liệu timeline trạng thái theo ngày.
export function getMachineStatusTimeline(id, params = {}) {
  return apiClient.get(`/machines/${id}/status-timeline`, { params })
}

// Gọi API lấy số lượng máy theo trạng thái.
export function getStatusCount() {
  return apiClient.get('/machines/status-count')
}

// Gọi API lấy tổng quan máy theo từng khu vực cho trang Home.
export function getLocationOverview() {
  return apiClient.get('/machines/location-overview')
}
