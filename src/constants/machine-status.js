const MACHINE_STATUS = {
  ONLINE: {
    id: 1,
    name: 'Đang chạy',
    color: '#16A34A',
    key: 'online'
  },
  PENDING: {
    id: 2,
    name: 'Tạm dừng',
    color: '#EAB308',
    key: 'pending'
  },
  ERROR: {
    id: 3,
    name: 'Lỗi',
    color: '#DC2626',
    key: 'error'
  }
}

export const NO_DATA_STATUS = {
  id: 0,
  name: 'Chưa có dữ liệu',
  color: '#6B7280',
  key: 'noData'
}

export function isNoDataStatusId(statusId) {
  const normalized = String(statusId ?? '').trim()

  return normalized === '' || normalized === String(NO_DATA_STATUS.id)
}

export function normalizeMachineStatusId(statusId) {
  const normalized = String(statusId ?? '').trim()

  return normalized || String(NO_DATA_STATUS.id)
}

// Trạng thái 0 là fallback hệ thống; id > 0 lấy tên/màu từ master data nếu API trả về.
export function getStatusById(statusId) {
  if (isNoDataStatusId(statusId)) {
    return NO_DATA_STATUS
  }

  return Object.values(MACHINE_STATUS).find((status) => status.id === Number(statusId)) || null
}

export default MACHINE_STATUS
