import { io } from 'socket.io-client'

let socket = null

// Tạo hoặc tái sử dụng kết nối Socket.IO namespace /machines.
export function connectSocket() {
  if (socket) {
    return socket
  }

  socket = io(`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'}/machines`, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  })

  return socket
}

// Ngắt kết nối Socket.IO khi cần dọn tài nguyên thủ công.
export function disconnectSocket() {
  if (!socket) {
    return
  }

  socket.disconnect()
  socket = null
}

// Đăng ký listener khi trạng thái máy thay đổi.
export function onMachineStatusUpdated(callback) {
  connectSocket().on('machine-status-updated', callback)
}

// Hủy listener trạng thái để tránh leak khi component unmount.
export function offMachineStatusUpdated(callback) {
  if (!socket) {
    return
  }

  socket.off('machine-status-updated', callback)
}

// Đăng ký listener khi backend lưu một machines_log mới.
export function onMachineLogCreated(callback) {
  connectSocket().on('machine-log-created', callback)
}

// Hủy listener log mới khi component unmount.
export function offMachineLogCreated(callback) {
  if (!socket) {
    return
  }

  socket.off('machine-log-created', callback)
}

// Lấy instance socket hiện tại cho các component cần đọc trạng thái connect/disconnect.
export function getSocket() {
  return connectSocket()
}
