<template>
  <main class="detail-page">
    <section v-if="machine" class="detail-header">
      <div>
        <h1>{{ machine.code }}</h1>
        <p>{{ machine.name }} - {{ machine.location?.location_name || 'Chưa có khu vực' }}</p>
      </div>
      <div class="detail-statuses">
        <MachineStatusBadge
          :status-id="machine.currentStatus?.status_id"
          :status-name="machine.currentStatus?.status_name"
          :status-color="machine.currentStatus?.color"
        />
        <span class="connection-badge">
          <span class="connection-dot" :style="{ backgroundColor: machineConnectionColor(machine) }"></span>
          {{ machineConnectionName(machine) }}
        </span>
      </div>
    </section>

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
        <div class="table-scroll log-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>l1</th>
                <th>l2</th>
                <th>l3</th>
                <th>l4</th>
                <th>Cycle Time (s)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="logs.length === 0">
                <td colspan="8" class="empty">Chưa có log.</td>
              </tr>
              <tr v-for="log in logs" :key="log._id || log.createdAt || log.ms">
                <td>{{ formatDateOnly(log.createdAt) }}</td>
                <td>{{ formatTimeOnly(log.createdAt) }}</td>
                <td>
                  <span class="status-color">
                    <span class="status-swatch" :style="{ backgroundColor: statusColor(logStatusId(log)) }"></span>
                    {{ statusName(logStatusId(log)) }}
                  </span>
                </td>
                <td>{{ signalValue(log, 'l1', 'I1') }}</td>
                <td>{{ signalValue(log, 'l2', 'I2') }}</td>
                <td>{{ signalValue(log, 'l3', 'I3') }}</td>
                <td>{{ signalValue(log, 'l4', 'I4') }}</td>
                <td>{{ formatCycleTimeSeconds(log) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
        <div class="table-scroll history-table-scroll">
          <table class="history-table">
            <colgroup>
              <col class="history-date-col" />
              <col class="history-time-col" />
              <col class="history-status-col" />
              <col class="history-description-col" />
            </colgroup>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="history.length === 0">
                <td colspan="4" class="empty">Chưa có lịch sử vận hành.</td>
              </tr>
              <tr v-for="item in history" :key="item._id">
                <td>{{ formatDateOnly(item.createdAt) }}</td>
                <td>{{ formatTimeOnly(item.createdAt) }}</td>
                <td>
                  <span class="status-color">
                    <span class="status-swatch" :style="{ backgroundColor: statusColor(item.status_id) }"></span>
                    {{ statusName(item.status_id) }}
                  </span>
                </td>
                <td>
                  <span class="history-description" :title="item.description || '-'">
                    {{ item.description || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
        <div class="table-scroll history-table-scroll">
          <table class="connection-history-table">
            <colgroup>
              <col class="history-date-col" />
              <col class="history-time-col" />
              <col class="connection-status-col" />
              <col class="connection-note-col" />
            </colgroup>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thời gian</th>
                <th>Kết nối</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="connectionHistory.length === 0">
                <td colspan="4" class="empty">Chưa có lịch sử kết nối.</td>
              </tr>
              <tr v-for="item in connectionHistory" :key="item._id || item.createdAt || item.eventAt">
                <td>{{ formatDateOnly(connectionEventTime(item)) }}</td>
                <td>{{ formatTimeOnly(connectionEventTime(item)) }}</td>
                <td>
                  <span class="status-color">
                    <span class="status-swatch" :style="{ backgroundColor: connectionColor(item) }"></span>
                    {{ connectionName(item) }}
                  </span>
                </td>
                <td>
                  <span class="history-description" :title="connectionNote(item)">
                    {{ connectionNote(item) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  getMachineById,
  getMachineConnectionHistory,
  getMachineLogs,
  getMachineStatusHistory
} from '@/api/machines.api'
import { getStatuses } from '@/api/statuses.api'
import MachineStatusBadge from '@/components/machines/MachineStatusBadge.vue'
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
const logPaginationText = computed(() => paginationText(logPagination.value, 'log'))
const historyPaginationText = computed(() => paginationText(historyPagination.value, 'mốc'))
const canGoPreviousLogPage = computed(() => logPagination.value.page > 1)
const canGoNextLogPage = computed(() => logPagination.value.page < logPagination.value.totalPages)
const canGoPreviousHistoryPage = computed(() => historyPagination.value.page > 1)
const canGoNextHistoryPage = computed(() => historyPagination.value.page < historyPagination.value.totalPages)
const connectionPaginationText = computed(() => paginationText(connectionPagination.value, 'mốc'))
const canGoPreviousConnectionPage = computed(() => connectionPagination.value.page > 1)
const canGoNextConnectionPage = computed(() => connectionPagination.value.page < connectionPagination.value.totalPages)

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

onMounted(async () => {
  try {
    await Promise.all([loadStatuses(), loadMachine(), loadRelatedData()])
    onMachineLogCreated(handleRealtimeLog)
    onMachineStatusUpdated(handleRealtimeStatus)
    onMachineConnectionUpdated(handleRealtimeConnection)
  } catch (err) {
    error.value = err.message
  }
})

onUnmounted(() => {
  offMachineLogCreated(handleRealtimeLog)
  offMachineStatusUpdated(handleRealtimeStatus)
  offMachineConnectionUpdated(handleRealtimeConnection)
})
</script>

<style scoped>
.detail-page {
  --detail-table-visible-height: 320px;
  display: grid;
  gap: 14px;
  min-height: 50vh;
  padding: 20px;
  background: #f8fafc;
}

a {
  color: #0f62b4;
  font-weight: 800;
}

.detail-header,
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  background: #ffffff;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 12px 16px;
}

.detail-statuses,
.connection-badge {
  display: inline-flex;
  align-items: center;
}

.detail-statuses {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 14px;
}

.connection-badge {
  gap: 8px;
  color: #111827;
  font-weight: 800;
  white-space: nowrap;
}

.connection-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

h1,
h2,
p {
  margin: 0;
}

.detail-header h1 {
  font-size: 32px;
  line-height: 1.1;
}

.detail-header p {
  margin-top: 4px;
  color: #475569;
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
  color: #64748b;
  font-size: 13px;
}

.pagination-controls {
  display: flex;
  gap: 8px;
}

.pagination-controls button {
  align-self: center;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  background: #ffffff;
  color: #0f172a;
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
  border: 1px solid #edf2f7;
  border-radius: 6px;
  overflow-anchor: none;
}

.history-table-scroll {
  max-height: var(--detail-table-visible-height);
  border: 1px solid #edf2f7;
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
  border-bottom: 1px solid #edf2f7;
  padding: 7px 10px;
  text-align: left;
  vertical-align: middle;
}

th {
  background: #f8fafc;
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
  color: #991b1b;
}

.panel-message {
  margin-top: 10px;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 9px 10px;
  background: #fffbeb;
  color: #92400e;
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
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 4px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .detail-header,
  .detail-statuses,
  .panel-header div:first-child {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
