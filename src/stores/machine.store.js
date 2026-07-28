import { defineStore } from 'pinia'
import {
  createMachine,
  deleteMachine,
  getMachineById,
  getMachineLogs,
  getMachines,
  getStatusCount,
  updateMachine
} from '@/api/machines.api'
import { getStatusById } from '@/constants/machine-status'

// Map status_id sang key thống kê.
function countKey(statusId) {
  const status = getStatusById(statusId)

  return status?.key || null
}

// Count mặc định khi chưa có dữ liệu.
function emptyStatusCount() {
  return {
    total: 0,
    online: 0,
    pending: 0,
    error: 0,
    offline: 0,
    noData: 0
  }
}

// Lấy thời điểm log tốt nhất.
function latestLogTime(log) {
  return log?.createdAt || log?.created_at || log?.updatedAt || log?.updated_at || log?.timestamp || null
}

// Lấy payload chính từ realtime event.
function eventPayload(event) {
  return event?.log || event?.data || event
}

// Lấy machine kèm trong event nếu có.
function eventMachine(event, payload) {
  return payload?.machine || event?.machine
}

// Lấy trạng thái từ event hoặc machine.
function eventStatus(event, payload) {
  return (
    payload?.currentStatus ||
    payload?.status ||
    event?.currentStatus ||
    event?.status ||
    eventMachine(event, payload)?.currentStatus ||
    eventMachine(event, payload)?.status
  )
}

// Tách signalKeys để so khớp event.
function splitSignalKeys(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

// Tìm field đầu tiên có giá trị.
function eventField(event, payload, fields) {
  for (const field of fields) {
    if (payload?.[field] !== undefined && payload?.[field] !== null) {
      return payload[field]
    }

    if (event?.[field] !== undefined && event?.[field] !== null) {
      return event[field]
    }
  }

  return undefined
}

// Kiểm tra event có thuộc máy này không.
function machineMatchesLogEvent(machine, event) {
  const payload = eventPayload(event)
  const machineFromEvent = eventMachine(event, payload)
  const machineId =
    eventField(event, payload, ['machineId', 'machine_id']) ?? machineFromEvent?._id ?? machineFromEvent?.id
  const machineCode =
    eventField(event, payload, ['machineCode', 'machine_code']) ?? machineFromEvent?.code
  const signalKey = eventField(event, payload, ['signalKeys', 'signalKey', 'signal_key'])
  const machineSignalKeys = splitSignalKeys(machine.signalKeys)

  return (
    String(machine._id) === String(machineId) ||
    String(machine.code) === String(machineCode) ||
    machineSignalKeys.includes(String(signalKey))
  )
}

// Chuẩn hóa payload trạng thái realtime.
function realtimeStatusPayload(event, payload = eventPayload(event)) {
  const status = eventStatus(event, payload)
  let statusId =
    eventField(event, payload, ['statusId', 'status_id']) ??
    status?.status_id ??
    status?.id ??
    eventMachine(event, payload)?.status_id

  if ((typeof status === 'number' || typeof status === 'string') && statusId === undefined) {
    statusId = status
  }

  if (statusId === undefined || statusId === null || statusId === '') {
    return null
  }

  const fallbackStatus = getStatusById(statusId)

  return {
    statusId,
    statusName:
      eventField(event, payload, ['statusName', 'status_name']) ??
      status?.status_name ??
      status?.name ??
      fallbackStatus?.name,
    statusColor:
      eventField(event, payload, ['statusColor', 'status_color', 'colorCode', 'color_code', 'color']) ??
      status?.color_code ??
      status?.color ??
      fallbackStatus?.color,
    updatedAt:
      eventField(event, payload, ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'timestamp']) ??
      status?.updatedAt ??
      status?.updated_at ??
      latestLogTime(payload) ??
      latestLogTime(event)
  }
}

export const useMachineStore = defineStore('machine', {
  state: () => ({
    machines: [],
    selectedMachine: null,
    loading: false,
    saving: false,
    error: '',
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    filters: {
      keyword: '',
      location_id: '',
      status_id: '',
      noData: '',
      abnormal: '',
      sortBy: 'code',
      sortOrder: 'asc'
    },
    statusCount: {
      total: 0,
      online: 0,
      pending: 0,
      error: 0,
      offline: 0,
      noData: 0
    }
  }),

  actions: {
    // Tải danh sách máy theo filter.
    async fetchMachines(extraParams = {}) {
      this.loading = true
      this.error = ''

      try {
        const response = await getMachines({
          ...this.filters,
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...extraParams
        })

        this.machines = response.data || []
        this.pagination = response.pagination || this.pagination
        await this.fetchLatestSignals()
        this.applyStatusCountFallback()
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    // Lấy tín hiệu cuối cho từng máy.
    async fetchLatestSignals() {
      const results = await Promise.allSettled(
        this.machines.map(async (machine) => {
          const response = await getMachineLogs(machine._id, { limit: 1 })
          const latestLog = Array.isArray(response.data) ? response.data[0] : null

          machine.lastSignalAt = latestLogTime(latestLog)
          machine.lastSignalLog = latestLog
        })
      )

      const rejected = results.find((result) => result.status === 'rejected')

      if (rejected) {
        this.error = rejected.reason?.message || 'Không tải được tín hiệu cuối'
      }
    },

    // Tải chi tiết máy.
    async fetchMachineById(id) {
      this.loading = true
      this.error = ''

      try {
        const response = await getMachineById(id)
        this.selectedMachine = response.data
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    // Tạo máy rồi refresh danh sách.
    async createMachine(payload) {
      this.saving = true
      this.error = ''

      try {
        await createMachine(payload)
        await this.fetchMachines({ page: 1 })
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.saving = false
      }
    },

    // Cập nhật máy rồi refresh danh sách.
    async updateMachine(id, payload) {
      this.saving = true
      this.error = ''

      try {
        await updateMachine(id, payload)
        await this.fetchMachines()
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.saving = false
      }
    },

    // Xóa máy rồi refresh danh sách.
    async deleteMachine(id) {
      this.saving = true
      this.error = ''

      try {
        await deleteMachine(id)
        await this.fetchMachines()
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.saving = false
      }
    },

    // Tải số lượng máy theo trạng thái.
    async fetchStatusCount() {
      const response = await getStatusCount()
      this.statusCount = response.data || this.statusCount
      this.applyStatusCountFallback()
    },

    // Tự tính count nếu backend chưa trả.
    applyStatusCountFallback() {
      const total = Number(this.pagination.total) || this.machines.length

      if (!total || this.statusCount.total > 0) {
        return
      }

      const counts = emptyStatusCount()
      counts.total = total

      for (const machine of this.machines) {
        const key = countKey(machine.currentStatus?.status_id)

        if (key) {
          counts[key] += 1
        }
      }

      const countedStatuses = counts.online + counts.pending + counts.error + counts.offline
      counts.noData = Math.max(total - countedStatuses, 0)
      this.statusCount = counts
    },

    // Áp trạng thái realtime vào máy.
    applyRealtimeStatus(machine, event, payload = eventPayload(event)) {
      const realtimeStatus = realtimeStatusPayload(event, payload)

      if (!realtimeStatus) {
        return false
      }

      const oldKey = countKey(machine.currentStatus?.status_id)
      const newKey = countKey(realtimeStatus.statusId)

      machine.currentStatus = {
        status_id: realtimeStatus.statusId,
        status_name: realtimeStatus.statusName,
        color: realtimeStatus.statusColor,
        color_code: realtimeStatus.statusColor,
        updatedAt: realtimeStatus.updatedAt
      }
      machine.status_id = realtimeStatus.statusId
      machine.lastUpdatedAt = realtimeStatus.updatedAt
      machine.highlightedAt = Date.now()

      // Cập nhật count cục bộ.
      if (oldKey !== newKey && this.statusCount.total > 0) {
        if (oldKey && this.statusCount[oldKey] > 0) {
          this.statusCount[oldKey] -= 1
        } else if (!oldKey && this.statusCount.noData > 0) {
          this.statusCount.noData -= 1
        }

        if (newKey) {
          this.statusCount[newKey] += 1
        }
      }

      return true
    },

    // Xử lý event đổi trạng thái.
    updateMachineStatusRealtime(event) {
      const machine = this.machines.find((item) => machineMatchesLogEvent(item, event))

      if (!machine) {
        return
      }

      this.applyRealtimeStatus(machine, event)
    },

    // Xử lý event log mới.
    updateMachineLogRealtime(event) {
      const payload = eventPayload(event)
      const machine = this.machines.find((item) => machineMatchesLogEvent(item, event))

      if (!machine) {
        return
      }

      machine.lastSignalAt = latestLogTime(payload) || latestLogTime(event) || new Date().toISOString()
      machine.lastSignalLog = payload
      machine.highlightedAt = Date.now()
      this.applyRealtimeStatus(machine, event, payload)
    },

    // Reset filter.
    resetFilters() {
      this.filters = {
        keyword: '',
        location_id: '',
        status_id: '',
        noData: '',
        abnormal: '',
        sortBy: 'code',
        sortOrder: 'asc'
      }
      this.pagination.page = 1
    }
  }
})
