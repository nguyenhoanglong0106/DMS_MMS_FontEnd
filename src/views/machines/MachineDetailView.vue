<template>
  <main class="detail-page">
    <FilterRailLayout title="Chi tiết máy" :subtitle="detailSubtitle" storage-key="machine-detail" rail-label="Thông tin">
      <template #dock>
        <section v-if="machine" class="detail-summary">
          <h2>{{ machine.code }}</h2>
          <p>{{ machine.name }}</p>
          <span>{{ machine.location?.location_name || 'Chưa có khu vực' }}</span>

          <div class="detail-statuses">
            <div class="status-row machine-status-row">
              <span class="status-label-text">Trạng thái máy</span>
              <span class="status-value">
                <span class="status-dot" :style="{ backgroundColor: machineStatusColor(machine) }"></span>
                {{ machineStatusName(machine) }}
              </span>
            </div>
            <div class="status-row board-status-row">
              <span class="status-label-text">Trạng thái board</span>
              <span class="status-value">
                <span class="connection-dot" :style="{ backgroundColor: machineConnectionColor(machine) }"></span>
                {{ machineConnectionName(machine) }}
              </span>
            </div>
          </div>
        </section>
        <section v-else class="detail-summary">
          <h2>Đang tải...</h2>
          <p>Đang lấy thông tin máy.</p>
        </section>

        <button type="button" class="dock-button primary" @click="loadCurrentMachineView({ reset: true })">
          <i class="fas fa-sync-alt" aria-hidden="true"></i>
          <span>Tải lại chi tiết</span>
        </button>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

    <section class="grid">
      <article class="panel">
        <header class="panel-header">
          <div>
            <h2>Log tín hiệu gần nhất</h2>
            <span>{{ logPaginationText }}</span>
          </div>
          <div class="pagination-controls">
            <button type="button" :disabled="!canGoPreviousLogPage" @click="changeLogPage(logPagination.page - 1)">
              Trước
            </button>
            <button type="button" :disabled="!canGoNextLogPage" @click="changeLogPage(logPagination.page + 1)">
              Sau
            </button>
          </div>
        </header>
        <DataGrid
          :columns="logColumns"
          :rows="logs"
          :row-key="logRowKey"
          storage-key="machine-detail-logs"
          empty-text="Chưa có log."
          max-height="var(--detail-table-visible-height)"
          sticky-header
        >
          <template #cell-status="{ row }">
            <span class="status-color">
              <span class="status-swatch" :style="{ backgroundColor: statusColor(logStatusId(row)) }"></span>
              {{ statusName(logStatusId(row)) }}
            </span>
          </template>
        </DataGrid>
      </article>

      <article class="panel">
        <header class="panel-header">
          <div>
            <h2>Lịch sử vận hành</h2>
            <span>{{ historyPaginationText }}</span>
          </div>
          <div class="pagination-controls">
            <button
              type="button"
              :disabled="!canGoPreviousHistoryPage"
              @click="changeHistoryPage(historyPagination.page - 1)"
            >
              Trước
            </button>
            <button type="button" :disabled="!canGoNextHistoryPage" @click="changeHistoryPage(historyPagination.page + 1)">
              Sau
            </button>
          </div>
        </header>
        <DataGrid
          :columns="historyColumns"
          :rows="history"
          :row-key="historyRowKey"
          storage-key="machine-detail-status-history"
          empty-text="Chưa có lịch sử vận hành."
          max-height="var(--detail-table-visible-height)"
          sticky-header
        >
          <template #cell-status="{ row }">
            <span class="status-color">
              <span class="status-swatch" :style="{ backgroundColor: statusColor(row.status_id) }"></span>
              {{ statusName(row.status_id) }}
            </span>
          </template>

          <template #cell-description="{ row }">
            <span class="history-description" :title="row.description || '-'">
              {{ row.description || '-' }}
            </span>
          </template>
        </DataGrid>
      </article>

      <article class="panel connection-panel">
        <header class="panel-header">
          <div>
            <h2>Lịch sử kết nối</h2>
            <span>{{ connectionPaginationText }}</span>
          </div>
          <div class="pagination-controls">
            <button
              type="button"
              :disabled="!canGoPreviousConnectionPage"
              @click="changeConnectionPage(connectionPagination.page - 1)"
            >
              Trước
            </button>
            <button
              type="button"
              :disabled="!canGoNextConnectionPage"
              @click="changeConnectionPage(connectionPagination.page + 1)"
            >
              Sau
            </button>
          </div>
        </header>
        <p v-if="connectionHistoryError" class="panel-message">{{ connectionHistoryError }}</p>
        <DataGrid
          :columns="connectionHistoryColumns"
          :rows="connectionHistory"
          :row-key="connectionHistoryRowKey"
          storage-key="machine-detail-connection-history"
          empty-text="Chưa có lịch sử kết nối."
          max-height="var(--detail-table-visible-height)"
          sticky-header
        >
          <template #cell-connection="{ row }">
            <span class="status-color">
              <span class="status-swatch" :style="{ backgroundColor: connectionColor(row) }"></span>
              {{ connectionName(row) }}
            </span>
          </template>

          <template #cell-note="{ row }">
            <span class="history-description" :title="connectionNote(row)">
              {{ connectionNote(row) }}
            </span>
          </template>
        </DataGrid>
      </article>
    </section>
    </FilterRailLayout>
  </main>
</template>

<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getMachineById,
  getMachineConnectionHistory,
  getMachineLogs,
  getMachineStatusHistory
} from '@/api/machines.api'
import { getStatuses } from '@/api/statuses.api'
import DataGrid from '@/components/grid/DataGrid.vue'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'
import { NO_DATA_STATUS, isNoDataStatusId } from '@/constants/machine-status'
import {
  offMachineConnectionUpdated,
  offMachineLogCreated,
  offMachineStatusUpdated,
  onMachineConnectionUpdated,
  onMachineLogCreated,
  onMachineStatusUpdated
} from '@/services/socket.service'
import { formatDateOnly, formatTimeOnly } from '@/utils/date-format'

const route = useRoute()
const machine = ref(null)
const logs = ref([])
const history = ref([])
const logStatusHistory = ref([])
const statuses = ref([])
const error = ref('')
const LOG_PAGE_SIZE = 10
const LOG_MAX_ITEMS = 50
const LOG_STATUS_HISTORY_LIMIT = 100
const HISTORY_PAGE_SIZE = 10
const CONNECTION_PAGE_SIZE = 10
const ONLINE_CONNECT_ID = '1'
const OFFLINE_CONNECT_ID = '2'
const logPagination = ref({
  page: 1,
  limit: LOG_PAGE_SIZE,
  total: 0,
  totalPages: 1
})
const historyPagination = ref({
  page: 1,
  limit: HISTORY_PAGE_SIZE,
  total: 0,
  totalPages: 1
})
const connectionHistory = ref([])
const connectionHistoryError = ref('')
const connectionPagination = ref({
  page: 1,
  limit: CONNECTION_PAGE_SIZE,
  total: 0,
  totalPages: 1
})
let realtimeHandlersBound = false
const detailSubtitle = computed(() => (
  machine.value
    ? `${machine.value.name} - ${machine.value.location?.location_name || 'Chưa có khu vực'}`
    : 'Đang tải chi tiết máy'
))
const logPaginationText = computed(() => paginationText(logPagination.value, 'log'))
const historyPaginationText = computed(() => paginationText(historyPagination.value, 'mốc'))
const canGoPreviousLogPage = computed(() => logPagination.value.page > 1)
const canGoNextLogPage = computed(() => logPagination.value.page < logPagination.value.totalPages)
const canGoPreviousHistoryPage = computed(() => historyPagination.value.page > 1)
const canGoNextHistoryPage = computed(() => historyPagination.value.page < historyPagination.value.totalPages)
const connectionPaginationText = computed(() => paginationText(connectionPagination.value, 'mốc'))
const canGoPreviousConnectionPage = computed(() => connectionPagination.value.page > 1)
const canGoNextConnectionPage = computed(() => connectionPagination.value.page < connectionPagination.value.totalPages)
const logColumns = [
  { key: 'date', label: 'Ngày', value: (log) => formatDateOnly(log.createdAt), width: 112 },
  { key: 'time', label: 'Thời gian', value: (log) => formatTimeOnly(log.createdAt), width: 106 },
  { key: 'status', label: 'Trạng thái', value: (log) => statusName(logStatusId(log)), width: 150 },
  { key: 'l1', label: 'l1', value: (log) => signalValue(log, 'l1', 'I1'), width: 70 },
  { key: 'l2', label: 'l2', value: (log) => signalValue(log, 'l2', 'I2'), width: 70 },
  { key: 'l3', label: 'l3', value: (log) => signalValue(log, 'l3', 'I3'), width: 70 },
  { key: 'l4', label: 'l4', value: (log) => signalValue(log, 'l4', 'I4'), width: 70 },
  { key: 'cycleTime', label: 'Cycle Time (s)', value: formatCycleTimeSeconds, width: 150 }
]
const historyColumns = [
  { key: 'date', label: 'Ngày', value: (item) => formatDateOnly(item.createdAt), width: 112 },
  { key: 'time', label: 'Thời gian', value: (item) => formatTimeOnly(item.createdAt), width: 106 },
  { key: 'status', label: 'Trạng thái', value: (item) => statusName(item.status_id), width: 150 },
  { key: 'description', label: 'Mô tả', value: (item) => item.description || '-', width: 320 }
]
const connectionHistoryColumns = [
  { key: 'date', label: 'Ngày', value: (item) => formatDateOnly(connectionEventTime(item)), width: 112 },
  { key: 'time', label: 'Thời gian', value: (item) => formatTimeOnly(connectionEventTime(item)), width: 106 },
  { key: 'connection', label: 'Kết nối', value: connectionName, width: 150 },
  { key: 'note', label: 'Ghi chú', value: connectionNote, width: 420 }
]

function logRowKey(log, index) {
  return log._id || log.createdAt || log.ms || index
}

function historyRowKey(item, index) {
  return item._id || item.createdAt || index
}

function connectionHistoryRowKey(item, index) {
  return item._id || item.createdAt || item.eventAt || index
}

// Giới hạn bảng log chỉ hiển thị 50 log mới nhất, dù backend còn nhiều log cũ hơn.
function cappedLogPagination(pagination) {
  const total = Math.min(Number(pagination?.total) || 0, LOG_MAX_ITEMS)
  const totalPages = Math.max(Math.ceil(total / LOG_PAGE_SIZE), 1)
  const page = Math.min(Number(pagination?.page) || 1, totalPages)

  return {
    page,
    limit: LOG_PAGE_SIZE,
    total,
    totalPages
  }
}

function resetDetailData() {
  machine.value = null
  logs.value = []
  history.value = []
  logStatusHistory.value = []
  connectionHistory.value = []
  connectionHistoryError.value = ''
  logPagination.value = {
    page: 1,
    limit: LOG_PAGE_SIZE,
    total: 0,
    totalPages: 1
  }
  historyPagination.value = {
    page: 1,
    limit: HISTORY_PAGE_SIZE,
    total: 0,
    totalPages: 1
  }
  connectionPagination.value = {
    page: 1,
    limit: CONNECTION_PAGE_SIZE,
    total: 0,
    totalPages: 1
  }
}

// Tạo query dùng chung cho log tín hiệu và lịch sử trạng thái.
function createQuery(page, limit) {
  return { page, limit }
}

function createConnectionQuery(page, limit) {
  return { page, limit }
}

// Format text phân trang cho từng bảng.
function paginationText(pagination, unit) {
  const total = Number(pagination.total) || 0

  if (!total) {
    return `0 ${unit}`
  }

  const page = Number(pagination.page) || 1
  const limit = Number(pagination.limit) || 1
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return `${start} - ${end} / ${total} ${unit}`
}

// Lấy giá trị tín hiệu từ log, hỗ trợ cả l1/l2 và I1/I2.
function signalValue(log, field, fallbackField) {
  return log[field] ?? log[fallbackField] ?? '-'
}

function formatCycleTimeSeconds(log) {
  const rawValue = log?.cycleTime ?? log?.cycle_time

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '-'
  }

  const milliseconds = Number(rawValue)

  if (Number.isNaN(milliseconds)) {
    return '-'
  }

  const seconds = milliseconds / 1000

  return seconds.toFixed(2)
}

// Sắp xếp log mới nhất trước và giới hạn số dòng hiển thị.
function normalizeLogs(nextLogs) {
  return [...(Array.isArray(nextLogs) ? nextLogs : [])]
    .filter(Boolean)
    .sort((first, second) => {
      const firstTime = new Date(first.createdAt || first.updatedAt || 0).getTime()
      const secondTime = new Date(second.createdAt || second.updatedAt || 0).getTime()

      return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime)
    })
    .slice(0, LOG_PAGE_SIZE)
}

// Lấy log thực sự từ realtime event nếu event có gửi kèm dữ liệu log.
function resolveRealtimeLog(event) {
  const payload = event?.log || event?.data || event

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const hasLogData =
    payload._id ||
    payload.id ||
    payload.createdAt ||
    payload.l1 !== undefined ||
    payload.I1 !== undefined ||
    payload.cycleTime !== undefined ||
    payload.ms !== undefined

  return hasLogData ? payload : null
}

// Kiểm tra hai log có cùng id để tránh thêm trùng dòng realtime.
function sameLog(first, second) {
  if (!first || !second) {
    return false
  }

  if (first._id && second._id) {
    return String(first._id) === String(second._id)
  }

  if (first.id && second.id) {
    return String(first.id) === String(second.id)
  }

  return false
}

function statusMeta(statusId) {
  return statuses.value.find((status) => String(status.status_id) === String(statusId)) || null
}

function statusName(statusId) {
  if (isNoDataStatusId(statusId)) return NO_DATA_STATUS.name

  return statusMeta(statusId)?.status_name || statusId || '-'
}

function statusColor(statusId) {
  const meta = statusMeta(statusId)

  return meta?.color_code || meta?.color || NO_DATA_STATUS.color
}

function machineStatusName(item) {
  return item?.currentStatus?.status_name || statusName(item?.currentStatus?.status_id || item?.status_id)
}

function machineStatusColor(item) {
  return item?.currentStatus?.color_code || item?.currentStatus?.color || statusColor(item?.currentStatus?.status_id || item?.status_id)
}

// Chuẩn hóa mọi biến thể giá trị connect_id/offline/online về đúng 2 mã chuẩn.
function normalizeConnectId(value) {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === OFFLINE_CONNECT_ID || normalized === 'offline') {
    return OFFLINE_CONNECT_ID
  }

  return ONLINE_CONNECT_ID
}

function fallbackConnectionStatus(connectId) {
  const normalized = normalizeConnectId(connectId)

  return {
    connect_id: normalized,
    connect_desc: normalized === OFFLINE_CONNECT_ID ? 'Offline' : 'Online',
    color_code: normalized === OFFLINE_CONNECT_ID ? '#DC2626' : '#16A34A'
  }
}

// Chấp nhận value là string connect_id thô hoặc object status đầy đủ,
// luôn trả về object status chuẩn (có fallback cho field thiếu).
function connectionStatusFromValue(value) {
  const isObjectValue = value && typeof value === 'object'
  const connectId = normalizeConnectId(isObjectValue ? value.connect_id ?? value.connectId ?? value.connect_desc ?? value.name : value)
  const fallback = fallbackConnectionStatus(connectId)
  const meta = isObjectValue ? value : {}

  return {
    ...fallback,
    ...meta,
    connect_id: connectId,
    connect_desc: meta.connect_desc || meta.name || fallback.connect_desc,
    color_code: meta.color_code || meta.color || fallback.color_code
  }
}

function machineConnectionStatus(item) {
  return connectionStatusFromValue(item?.connectionStatus || item?.connect_id || item?.connectId || ONLINE_CONNECT_ID)
}

function machineConnectionName(item) {
  return machineConnectionStatus(item).connect_desc
}

function machineConnectionColor(item) {
  const status = machineConnectionStatus(item)

  return status.color_code || status.color || fallbackConnectionStatus(status.connect_id).color_code
}

function connectionStatus(item) {
  return connectionStatusFromValue(
    item?.connectionStatus ||
      item?.status ||
      {
        connect_id: item?.connect_id ?? item?.connectId,
        connect_desc: item?.connect_desc,
        color_code: item?.color_code || item?.color
      }
  )
}

function connectionName(item) {
  return connectionStatus(item).connect_desc
}

function connectionColor(item) {
  const status = connectionStatus(item)

  return status.color_code || status.color || fallbackConnectionStatus(status.connect_id).color_code
}

function connectionEventTime(item) {
  return item?.eventAt || item?.event_at || item?.createdAt || item?.created_at || item?.updatedAt || item?.updated_at
}

function previousConnectionName(item) {
  const previousId = item?.previous_connect_id ?? item?.previousConnectId

  if (previousId === undefined || previousId === null || previousId === '') {
    return ''
  }

  return fallbackConnectionStatus(previousId).connect_desc
}

function connectionNote(item) {
  const previousName = previousConnectionName(item)

  return previousName
    ? `Thay đổi trạng thái from ${previousName} to ${connectionName(item)}`
    : connectionName(item)
}

// Tìm trạng thái tương ứng với thời điểm phát sinh log.
function logStatusId(log) {
  const explicitStatusId = log?.status_id ?? log?.statusId ?? log?.currentStatus?.status_id

  if (explicitStatusId !== undefined && explicitStatusId !== null && explicitStatusId !== '') {
    return explicitStatusId
  }

  const logTime = new Date(log?.createdAt || log?.updatedAt || 0).getTime()

  if (Number.isNaN(logTime)) {
    return machine.value?.currentStatus?.status_id || machine.value?.status_id || null
  }

  const matchedStatus = logStatusHistory.value.find((item) => {
    const statusTime = new Date(item.createdAt || item.updatedAt || 0).getTime()

    return !Number.isNaN(statusTime) && statusTime <= logTime
  })

  return matchedStatus?.status_id || machine.value?.currentStatus?.status_id || machine.value?.status_id || null
}

// Kiểm tra realtime event có thuộc máy đang xem chi tiết hay không.
function machineMatchesEvent(event) {
  const payload = event?.log || event?.data || event
  const machineId =
    payload?.machineId ??
    payload?.machine_id ??
    payload?.machine?._id ??
    payload?.machine?.id ??
    event?.machineId ??
    event?.machine_id ??
    event?.machine?._id ??
    event?.machine?.id
  const machineCode =
    payload?.machineCode ??
    payload?.machine_code ??
    payload?.machine?.code ??
    event?.machineCode ??
    event?.machine_code ??
    event?.machine?.code
  const signalKey =
    payload?.signalKeys ??
    payload?.signalKey ??
    payload?.signal_key ??
    event?.signalKeys ??
    event?.signalKey ??
    event?.signal_key

  if (!machine.value) {
    return String(machineId) === String(route.params.id)
  }

  const signalKeys = String(machine.value.signalKeys || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    String(machineId) === String(route.params.id) ||
    String(machineCode) === String(machine.value.code) ||
    signalKeys.includes(String(signalKey))
  )
}

// Thêm log realtime vào bảng chi tiết nếu event thuộc máy hiện tại.
async function handleRealtimeLog(event) {
  if (!machineMatchesEvent(event)) {
    return
  }

  try {
    const realtimeLog = resolveRealtimeLog(event)

    if (!realtimeLog) {
      await loadLogs()
      return
    }

    if (logPagination.value.page !== 1) {
      await loadLogs()
      return
    }

    const isNewLog = !logs.value.some((log) => sameLog(log, realtimeLog))
    const total = isNewLog ? Math.min(logPagination.value.total + 1, LOG_MAX_ITEMS) : logPagination.value.total

    logs.value = normalizeLogs([realtimeLog, ...logs.value.filter((log) => !sameLog(log, realtimeLog))])
    logPagination.value = {
      ...logPagination.value,
      total,
      totalPages: Math.max(Math.ceil(total / LOG_PAGE_SIZE), 1)
    }
  } catch (err) {
    error.value = err.message
  }
}

// Reload trạng thái và lịch sử khi máy hiện tại đổi trạng thái.
async function handleRealtimeStatus(event) {
  if (!machineMatchesEvent(event)) {
    return
  }

  await Promise.all([loadMachine(), loadStatusHistory(), loadLogStatusHistory()])
}

async function handleRealtimeConnection(event) {
  if (!machineMatchesEvent(event)) {
    return
  }

  await Promise.all([loadMachine(), loadConnectionHistory()])
}

// Tải thông tin chi tiết máy hiện tại.
async function loadMachine() {
  const response = await getMachineById(route.params.id)
  machine.value = response.data
}

async function loadStatuses() {
  const response = await getStatuses()
  statuses.value = response.data || []
}

// Tải danh sách log tín hiệu của máy hiện tại.
async function loadLogs() {
  const response = await getMachineLogs(route.params.id, createQuery(logPagination.value.page, LOG_PAGE_SIZE))
  logs.value = normalizeLogs(response.data || [])
  logPagination.value = cappedLogPagination(response.pagination || logPagination.value)
}

// Tải lịch sử trạng thái của máy hiện tại.
async function loadStatusHistory() {
  const response = await getMachineStatusHistory(route.params.id, createQuery(historyPagination.value.page, HISTORY_PAGE_SIZE))
  history.value = response.data || []
  historyPagination.value = response.pagination || historyPagination.value
}

// Tải lịch sử Online/Offline riêng, không chặn hai bảng vận hành nếu backend chưa có endpoint.
async function loadConnectionHistory() {
  try {
    const response = await getMachineConnectionHistory(
      route.params.id,
      createConnectionQuery(connectionPagination.value.page, CONNECTION_PAGE_SIZE)
    )
    connectionHistory.value = response.data || []
    connectionPagination.value = response.pagination || connectionPagination.value
    connectionHistoryError.value = ''
  } catch (err) {
    connectionHistory.value = []
    connectionPagination.value = {
      ...connectionPagination.value,
      total: 0,
      totalPages: 1
    }
    connectionHistoryError.value = 'Chưa tải được lịch sử kết nối.'
  }
}

// Tải lịch sử trạng thái đủ rộng để tô màu trạng thái cho từng dòng log.
async function loadLogStatusHistory() {
  const response = await getMachineStatusHistory(route.params.id, {
    page: 1,
    limit: LOG_STATUS_HISTORY_LIMIT
  })

  logStatusHistory.value = [...(response.data || [])].sort((first, second) => {
    const firstTime = new Date(first.createdAt || first.updatedAt || 0).getTime()
    const secondTime = new Date(second.createdAt || second.updatedAt || 0).getTime()

    return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime)
  })
}

// Chuyển trang cho bảng log tín hiệu.
async function changeLogPage(page) {
  if (page < 1 || page > logPagination.value.totalPages) {
    return
  }

  logPagination.value.page = page
  await loadLogs()
}

// Chuyển trang cho bảng lịch sử trạng thái.
async function changeHistoryPage(page) {
  if (page < 1 || page > historyPagination.value.totalPages) {
    return
  }

  historyPagination.value.page = page
  await loadStatusHistory()
}

// Chuyển trang cho bảng lịch sử kết nối.
async function changeConnectionPage(page) {
  if (page < 1 || page > connectionPagination.value.totalPages) {
    return
  }

  connectionPagination.value.page = page
  await loadConnectionHistory()
}

// Tải đồng thời log và lịch sử trạng thái, gom lỗi vào biến error.
async function loadRelatedData() {
  try {
    error.value = ''
    await Promise.all([loadLogs(), loadStatusHistory(), loadLogStatusHistory(), loadConnectionHistory()])
  } catch (err) {
    error.value = err.message
  }
}

async function loadCurrentMachineView({ includeStatuses = false, reset = false } = {}) {
  try {
    if (route.name !== 'Machine Detail' || !route.params.id) {
      return
    }

    error.value = ''

    if (reset) {
      resetDetailData()
    }

    const tasks = [loadMachine(), loadRelatedData()]

    if (includeStatuses || statuses.value.length === 0) {
      tasks.unshift(loadStatuses())
    }

    await Promise.all(tasks)
  } catch (err) {
    error.value = err.message
  }
}

watch(
  () => route.params.id,
  async (nextId, previousId) => {
    if (
      route.name !== 'Machine Detail' ||
      !nextId ||
      String(nextId) === String(previousId)
    ) {
      return
    }

    await loadCurrentMachineView({ reset: true })
  }
)

async function syncActiveRouteMachine() {
  bindRealtimeHandlers()

  if (
    route.name === 'Machine Detail' &&
    route.params.id &&
    String(machine.value?._id || '') !== String(route.params.id)
  ) {
    await loadCurrentMachineView({ reset: true })
  }
}

function bindRealtimeHandlers() {
  if (realtimeHandlersBound) {
    return
  }

  onMachineLogCreated(handleRealtimeLog)
  onMachineStatusUpdated(handleRealtimeStatus)
  onMachineConnectionUpdated(handleRealtimeConnection)
  realtimeHandlersBound = true
}

function unbindRealtimeHandlers() {
  if (!realtimeHandlersBound) {
    return
  }

  offMachineLogCreated(handleRealtimeLog)
  offMachineStatusUpdated(handleRealtimeStatus)
  offMachineConnectionUpdated(handleRealtimeConnection)
  realtimeHandlersBound = false
}

onMounted(async () => {
  await loadCurrentMachineView({ includeStatuses: true })
  bindRealtimeHandlers()
})

onActivated(syncActiveRouteMachine)
onDeactivated(unbindRealtimeHandlers)

onUnmounted(unbindRealtimeHandlers)
</script>

<style scoped>
.detail-page {
  --detail-table-visible-height: 320px;
  min-height: 50vh;
  padding: 16px;
  background: var(--app-bg);
  color: var(--text-color);
}

a {
  color: var(--primary-color);
  font-weight: 800;
}

.panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--surface-bg);
}

.detail-summary {
  display: grid;
  gap: 8px;
}

.detail-summary h2 {
  color: var(--text-color);
  font-size: 28px;
  line-height: 1.1;
}

.detail-summary p {
  color: var(--text-color);
  font-weight: 800;
}

.detail-summary > span {
  color: var(--muted-color);
  font-size: 13px;
}

.detail-statuses {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.status-row {
  display: grid;
  gap: 5px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 9px 10px;
  background: var(--surface-muted);
}

.status-label-text {
  color: var(--muted-color);
  font-size: 12px;
  font-weight: 800;
}

.status-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text-color);
  font-weight: 800;
  white-space: nowrap;
}

.status-dot,
.connection-dot {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.machine-status-row .status-dot {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--text-color) 9%, transparent);
}

.board-status-row .connection-dot {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--text-color) 9%, transparent);
}

h2,
p {
  margin: 0;
}

.grid {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.panel {
  min-width: 0;
}

.connection-panel {
  grid-column: 1 / -1;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-header div:first-child {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-header span {
  color: var(--muted-color);
  font-size: 13px;
}

:deep(.data-grid-shell) {
  margin-top: 8px;
}

.pagination-controls {
  display: flex;
  gap: 8px;
}

.pagination-controls button {
  align-self: center;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 10px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font-weight: 700;
}

.pagination-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.table-scroll {
  margin-top: 8px;
  overflow: auto;
}

.log-table-scroll {
  max-height: var(--detail-table-visible-height);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow-anchor: none;
}

.history-table-scroll {
  max-height: var(--detail-table-visible-height);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow-anchor: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.table-scroll table {
  margin-top: 0;
}

.history-table {
  table-layout: fixed;
  min-width: 640px;
}

.connection-history-table {
  table-layout: fixed;
  min-width: 980px;
}

.history-date-col {
  width: 112px;
}

.history-time-col {
  width: 96px;
}

.history-status-col {
  width: 128px;
}

.history-description-col {
  width: auto;
}

.connection-status-col {
  width: 130px;
}

.connection-note-col {
  width: auto;
}

th,
td {
  border-bottom: 1px solid var(--border-color);
  padding: 7px 10px;
  text-align: left;
  vertical-align: middle;
}

th {
  background: var(--table-header-bg);
  white-space: nowrap;
}

td:first-child,
td:nth-child(2) {
  white-space: nowrap;
}

.log-table-scroll th,
.history-table-scroll th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.empty,
.error {
  color: var(--error-text);
}

.panel-message {
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, #d97706 38%, var(--border-color));
  border-radius: 6px;
  padding: 9px 10px;
  background: color-mix(in srgb, #d97706 10%, var(--surface-bg));
  color: var(--text-color);
  font-size: 13px;
  font-weight: 700;
}

.status-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.history-description {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-swatch {
  width: 14px;
  height: 14px;
  border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
  border-radius: 4px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .detail-statuses,
  .panel-header div:first-child {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
