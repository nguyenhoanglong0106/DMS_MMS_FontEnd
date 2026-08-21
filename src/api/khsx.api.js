import apiClient from './axios'

// Loại bỏ query param rỗng để backend không nhận filter không cần thiết.
function buildKhsxQuery(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
}

// Lấy dữ liệu KHSX theo 1 trong 2 kiểu lọc ngày (có thể kết hợp cả 2, backend tự AND lại):
// - snapshotStartDate/snapshotEndDate: theo ngày nhập (snapshot), không nhầm với StartDate/DueDate của operation.
// - jobStartDateFrom/jobStartDateTo: theo JobHead_StartDate.
// params: { snapshotStartDate, snapshotEndDate, jobStartDateFrom, jobStartDateTo } (định dạng 'YYYY-MM-DD')
export function getKhsx(params = {}) {
  return apiClient.get('/khsx', { params: buildKhsxQuery(params) })
}
