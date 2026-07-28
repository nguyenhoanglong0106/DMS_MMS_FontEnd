const MACHINE_STATUS = {
  ONLINE: {
    id: 1,
    name: 'Online',
    color: '#16A34A',
    key: 'online'
  },
  PENDING: {
    id: 2,
    name: 'Pending',
    color: '#EAB308',
    key: 'pending'
  },
  ERROR: {
    id: 3,
    name: 'Error',
    color: '#DC2626',
    key: 'error'
  },
  OFFLINE: {
    id: 4,
    name: 'Offline',
    color: '#111827',
    key: 'offline'
  }
}

// Tìm cấu hình hiển thị trạng thái theo status_id.
export function getStatusById(statusId) {
  return Object.values(MACHINE_STATUS).find((status) => status.id === Number(statusId)) || null
}

export default MACHINE_STATUS
