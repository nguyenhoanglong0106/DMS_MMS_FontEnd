import apiClient from './axios'

// Loại bỏ query param rỗng để backend không nhận filter không cần thiết.
function buildKhsxQuery(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
}

// Gọi API lấy dữ liệu kế hoạch sản xuất (KHSX) từ BAQ Epicor DMS_GetKHSX, qua proxy backend.
// params: { startDate: 'YYYY-MM-DD', dueDate: 'YYYY-MM-DD' }
export function getKhsx(params = {}) {
  return apiClient.get('/khsx', { params: buildKhsxQuery(params) })
}
