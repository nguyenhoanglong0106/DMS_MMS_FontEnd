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
import { getStatusById, isNoDataStatusId } from '@/constants/machine-status'

// Map status_id sang key thống kê.
function countKey(statusId) {
  if (isNoDataStatusId(statusId)) {
    return 'noData'
  }

  const status = getStatusById(statusId)

  return status?.key || 'other'
}

// Count mặc định khi chưa có dữ liệu.
function emptyStatusCount() {
  return {
    total: 0,
    online: 0,
    pending: 0,
    error: 0,
    offline: 0,
    other: 0,
    noData: 0
  }
}

// Lấy thời điểm log tốt nhất.
function latestLogTime(log) {
  return log?.createdAt || log?.created_at || log?.updatedAt || log?.updated_at || log?.timestamp || null
}

// Kiểm tra field có giá trị thật, không tính rỗng/null/undefined.
function hasSignalValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

// Khóa để đối chiếu cùng 1 máy giữa 2 lần tải (ưu tiên _id, rồi id, rồi code).
function machineIdentity(machine) {
  return String(machine?._id || machine?.id || machine?.code || '')
}

// Response fetchMachines() không kèm các field chỉ cập nhật qua realtime
// (tín hiệu cuối, cycle time...). Nếu không giữ lại, mỗi lần load lại danh
// sách sẽ làm mất dữ liệu realtime vừa nhận được qua socket.
function preserveRealtimeSignalFields(machine, previousMachine) {
  if (!previousMachine) {
    return machine
  }

  if (!hasSignalValue(machine.lastSignalAt) && hasSignalValue(previousMachine.lastSignalAt)) {
    machine.lastSignalAt = previousMachine.lastSignalAt
  }

  if (!machine.lastSignalLog && previousMachine.lastSignalLog) {
    machine.lastSignalLog = previousMachine.lastSignalLog
  }

  if (!machine.latestLog && previousMachine.latestLog) {
    machine.latestLog = previousMachine.latestLog
  }

  for (const field of ['cycleTime', 'cycle_time']) {
    if (!hasSignalValue(machine[field]) && hasSignalValue(previousMachine[field])) {
      machine[field] = previousMachine[field]
    }
  }

  if (previousMachine.highlightedAt && !machine.highlightedAt) {
    machine.highlightedAt = previousMachine.highlightedAt
  }

  return machine
}

// Ghép danh sách máy mới tải với danh sách cũ để không mất field realtime.
function mergeMachineRefresh(machines, previousMachines) {
  const previousById = new Map(previousMachines.map((machine) => [machineIdentity(machine), machine]))

  return machines.map((machine) => preserveRealtimeSignalFields(machine, previousById.get(machineIdentity(machine))))
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

// Chuẩn hóa trạng thái kết nối từ event realtime về đúng shape dùng chung
// trong app (connect_id, tên hiển thị, màu), có fallback khi backend
// không gửi kèm object status đầy đủ.
function normalizeConnectionStatus(status, connectId) {
  const statusConnectId = String(status?.connect_id ?? connectId ?? '1')
  const colorCode = status?.color_code || status?.color || '#6B7280'

  return {
    connect_id: statusConnectId,
    connect_desc: status?.connect_desc || (statusConnectId === '2' ? 'Offline' : 'Online'),
    color: colorCode,
    color_code: colorCode
  }
}

// Chuẩn hóa payload event Online/Offline nhận qua socket.
function realtimeConnectionPayload(event) {
  const status = event?.connectionStatus || event?.status
  const connectId =
    eventField(event, event, ['connectId', 'connect_id']) ??
    status?.connect_id

  if (connectId === undefined || connectId === null || connectId === '') {
    return null
  }

  return {
    scope: event?.scope || '',
    machineId: event?.machineId || event?.machine_id || event?.machine?._id || event?.machine?.id,
    machineCode: event?.machineCode || event?.machine_code || event?.machine?.code,
    connect_id: String(connectId),
    connectionStatus: normalizeConnectionStatus(status, connectId),
    updatedAt: event?.updatedAt || event?.updated_at || new Date().toISOString()
  }
}

// Kiểm tra event Online/Offline có thuộc máy này không (so theo id hoặc code).
function machineMatchesConnectionEvent(machine, payload) {
  return (
    (payload.machineId && String(machine._id) === String(payload.machineId)) ||
    (payload.machineId && String(machine.id) === String(payload.machineId)) ||
    (payload.machineCode && String(machine.code) === String(payload.machineCode))
  )
}

export const useMachineStore = defineStore('machine', {
  state: () => ({
    machines: [],
    selectedMachine: null,
    loading: false,
    saving: false,
    error: '',
    fetchRequestId: 0,
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
      other: 0,
      noData: 0
    }
  }),

  actions: {
    // Tải danh sách máy theo filter.
    async fetchMachines(extraParams = {}, options = {}) {
      const requestId = this.fetchRequestId + 1
      this.fetchRequestId = requestId
      this.loading = true
      this.error = ''

      try {
        const response = await getMachines({
          ...this.filters,
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...extraParams
        })

        if (requestId !== this.fetchRequestId) {
          return false
        }

        this.machines = mergeMachineRefresh(response.data || [], this.machines)
        this.pagination = response.pagination || this.pagination

        if (options.includeLatestSignals === true) {
          await this.fetchLatestSignals(requestId)
        }

        if (requestId !== this.fetchRequestId) {
          return false
        }

        this.applyStatusCountFallback()

        if (options.backgroundLatestSignals === true) {
          this.fetchLatestSignals(requestId)
        }

        return true
      } catch (error) {
        if (requestId === this.fetchRequestId) {
          this.error = error.message
        }

        return false
      } finally {
        if (requestId === this.fetchRequestId) {
          this.loading = false
        }
      }
    },

    // Lấy tín hiệu cuối cho từng máy.
    async fetchLatestSignals(requestId = this.fetchRequestId) {
      const targetMachines = [...this.machines]
      const results = await Promise.allSettled(
        targetMachines.map(async (machine) => {
          const response = await getMachineLogs(machine._id, { limit: 1 })
          const latestLog = Array.isArray(response.data) ? response.data[0] : null

          return {
            machine,
            latestLog
          }
        })
      )

      if (requestId !== this.fetchRequestId) {
        return false
      }

      const visibleMachines = new Set(this.machines.map(machineIdentity))

      for (const result of results) {
        if (result.status !== 'fulfilled') {
          continue
        }

        const { machine, latestLog } = result.value

        if (!visibleMachines.has(machineIdentity(machine))) {
          continue
        }

        machine.lastSignalAt = latestLogTime(latestLog)
        machine.lastSignalLog = latestLog
      }

      const rejected = results.find((result) => result.status === 'rejected')

      if (rejected) {
        this.error = rejected.reason?.message || 'Không tải được tín hiệu cuối'
      }

      return true
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
    async createMachine(payload, fetchOptions = {}) {
      this.saving = true
      this.error = ''

      try {
        await createMachine(payload)
        await this.fetchMachines({ page: 1 }, fetchOptions)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.saving = false
      }
    },

    // Cập nhật máy rồi refresh danh sách.
    async updateMachine(id, payload, fetchOptions = {}) {
      this.saving = true
      this.error = ''

      try {
        await updateMachine(id, payload)
        await this.fetchMachines({}, fetchOptions)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.saving = false
      }
    },

    // Xóa máy rồi refresh danh sách.
    async deleteMachine(id, fetchOptions = {}) {
      this.saving = true
      this.error = ''

      try {
        await deleteMachine(id)
        await this.fetchMachines({}, fetchOptions)
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

      const countedStatuses = counts.online + counts.pending + counts.error + counts.offline + counts.other
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
        if (oldKey && Number(this.statusCount[oldKey]) > 0) {
          this.statusCount[oldKey] -= 1
        } else if (!oldKey && this.statusCount.noData > 0) {
          this.statusCount.noData -= 1
        }

        if (newKey) {
          this.statusCount[newKey] = Number(this.statusCount[newKey]) || 0
          this.statusCount[newKey] += 1
        }
      }

      return true
    },

    // Xử lý event đổi trạng thái.
    updateMachineStatusRealtime(event) {
      const machine = this.machines.find((item) => machineMatchesLogEvent(item, event))

      if (!machine) {
        return false
      }

      return this.applyRealtimeStatus(machine, event)
    },

    // Xử lý event log mới.
    updateMachineLogRealtime(event) {
      const payload = eventPayload(event)
      const machine = this.machines.find((item) => machineMatchesLogEvent(item, event))

      if (!machine) {
        return false
      }

      machine.lastSignalAt = latestLogTime(payload) || latestLogTime(event) || new Date().toISOString()
      machine.lastSignalLog = payload
      machine.highlightedAt = Date.now()
      this.applyRealtimeStatus(machine, event, payload)

      return true
    },

    // Xử lý event realtime đổi Online/Offline.
    applyMachineConnectionUpdate(event) {
      const payload = realtimeConnectionPayload(event)

      if (!payload) {
        return false
      }

      if (payload.scope === 'all') {
        for (const machine of this.machines) {
          machine.connect_id = payload.connect_id
          machine.connectionStatus = payload.connectionStatus
          machine.updatedAt = payload.updatedAt || machine.updatedAt
          machine.highlightedAt = Date.now()
        }

        if (this.selectedMachine) {
          this.selectedMachine.connect_id = payload.connect_id
          this.selectedMachine.connectionStatus = payload.connectionStatus
          this.selectedMachine.updatedAt = payload.updatedAt || this.selectedMachine.updatedAt
        }

        return Boolean(this.machines.length || this.selectedMachine)
      }

      const machine = this.machines.find((item) => machineMatchesConnectionEvent(item, payload))

      if (machine) {
        machine.connect_id = payload.connect_id
        machine.connectionStatus = payload.connectionStatus
        machine.updatedAt = payload.updatedAt || machine.updatedAt
        machine.highlightedAt = Date.now()
      }

      const selectedMatches = this.selectedMachine && machineMatchesConnectionEvent(this.selectedMachine, payload)

      if (selectedMatches) {
        this.selectedMachine.connect_id = payload.connect_id
        this.selectedMachine.connectionStatus = payload.connectionStatus
        this.selectedMachine.updatedAt = payload.updatedAt || this.selectedMachine.updatedAt
      }

      return Boolean(machine || selectedMatches)
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
