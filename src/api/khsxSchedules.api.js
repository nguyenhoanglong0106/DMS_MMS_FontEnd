import apiClient from './axios'

// Gọi API danh sách lịch đồng bộ KHSX.
export function getKhsxSchedules() {
  return apiClient.get('/khsx-schedules')
}

// Gọi API tạo lịch đồng bộ mới.
export function createKhsxSchedule(payload) {
  return apiClient.post('/khsx-schedules', payload)
}

// Gọi API cập nhật lịch đồng bộ.
export function updateKhsxSchedule(id, payload) {
  return apiClient.patch(`/khsx-schedules/${id}`, payload)
}

// Gọi API xóa lịch đồng bộ.
export function deleteKhsxSchedule(id) {
  return apiClient.delete(`/khsx-schedules/${id}`)
}

// Gọi API chạy đồng bộ ngay cho 1 lịch, không chờ tới giờ đã cấu hình.
export function runKhsxScheduleNow(id) {
  return apiClient.post(`/khsx-schedules/${id}/run`)
}
