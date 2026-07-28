<template>
  <main class="detail-page">
    <section v-if="machine" class="detail-header">
      <div>
        <h1>{{ machine.code }}</h1>
        <p>{{ machine.name }} - {{ machine.location?.location_name || 'Chưa có khu vực' }}</p>
      </div>
      <MachineStatusBadge
        :status-id="machine.currentStatus?.status_id"
        :status-name="machine.currentStatus?.status_name"
        :status-color="machine.currentStatus?.color"
      />
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
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>l1</th>
                <th>l2</th>
                <th>l3</th>
                <th>l4</th>
                <th>cycleTime</th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="logs.length === 0">
                <td colspan="8" class="empty">Chưa có log.</td>
              </tr>
              <tr v-for="log in logs" :key="log._id || log.createdAt || log.ms">
                <td>{{ formatDate(log.createdAt) }}</td>
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
                <td>{{ log.cycleTime ?? '-' }}</td>
                <td>{{ log.ms ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <header class="panel-header">
          <div>
            <h2>Lịch sử trạng thái</h2>
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
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="history.length === 0">
                <td colspan="3" class="empty">Chưa có lịch sử trạng thái.</td>
              </tr>
              <tr v-for="item in history" :key="item._id">
                <td>{{ formatDate(item.createdAt) }}</td>
                <td>
                  <span class="status-color">
                    <span class="status-swatch" :style="{ backgroundColor: statusColor(item.status_id) }"></span>
                    {{ statusName(item.status_id) }}
                  </span>
                </td>
                <td>{{ item.description || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getMachineById, getMachineLogs, getMachineStatusHistory } from '@/api/machines.api'
import { getStatuses } from '@/api/statuses.api'
import MachineStatusBadge from '@/components/machines/MachineStatusBadge.vue'
import {
  offMachineLogCreated,
  offMachineStatusUpdated,
  onMachineLogCreated,
  onMachineStatusUpdated
} from '@/services/socket.service'

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
const filters = reactive({
  from: '',
  to: '',
  status_id: ''
})

const logPaginationText = computed(() => paginationText(logPagination.value, 'log'))
const historyPaginationText = computed(() => paginationText(historyPagination.value, 'mốc'))
const canGoPreviousLogPage = computed(() => logPagination.value.page > 1)
const canGoNextLogPage = computed(() => logPagination.value.page < logPagination.value.totalPages)
const canGoPreviousHistoryPage = computed(() => historyPagination.value.page > 1)
const canGoNextHistoryPage = computed(() => historyPagination.value.page < historyPagination.value.totalPages)

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
  return {
    from: filters.from || undefined,
    to: filters.to || undefined,
    status_id: filters.status_id || undefined,
    page,
    limit
  }
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
  return statusMeta(statusId)?.status_name || statusId || '-'
}

function statusColor(statusId) {
  const meta = statusMeta(statusId)

  return meta?.color_code || meta?.color || '#6B7280'
}

// Tìm trạng thái tương ứng với thời điểm phát sinh log.
function logStatusId(log) {
  const explicitStatusId = log?.status_id ?? log?.statusId ?? log?.currentStatus?.status_id

  if (explicitStatusId) {
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

// Tải đồng thời log và lịch sử trạng thái, gom lỗi vào biến error.
async function loadRelatedData() {
  try {
    error.value = ''
    await Promise.all([loadLogs(), loadStatusHistory(), loadLogStatusHistory()])
  } catch (err) {
    error.value = err.message
  }
}

// Format timestamp sang định dạng ngày giờ Việt Nam.
function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('vi-VN')
}

onMounted(async () => {
  try {
    await Promise.all([loadStatuses(), loadMachine(), loadRelatedData()])
    onMachineLogCreated(handleRealtimeLog)
    onMachineStatusUpdated(handleRealtimeStatus)
  } catch (err) {
    error.value = err.message
  }
})

onUnmounted(() => {
  offMachineLogCreated(handleRealtimeLog)
  offMachineStatusUpdated(handleRealtimeStatus)
})
</script>

<style scoped>
.detail-page {
  display: grid;
  gap: 18px;
  min-height: 50vh;
  padding: 28px;
  background: #f8fafc;
}

a {
  color: #0f62b4;
  font-weight: 800;
}

.detail-header,
.filters,
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88px;
  padding: 18px 16px;
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

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr)) auto;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 700;
}

input,
select,
button {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
}

button {
  align-self: end;
  background: #0f62b4;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

.grid {
  display: grid;
  align-items: start;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.panel {
  min-width: 0;
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
  border-color: #d1d5db;
  padding: 0 10px;
  background: #ffffff;
  color: #0f172a;
  font-weight: 700;
}

.pagination-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.table-scroll {
  margin-top: 12px;
  overflow: auto;
}

.log-table-scroll {
  border: 1px solid #edf2f7;
  border-radius: 6px;
  overflow-anchor: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.table-scroll table {
  margin-top: 0;
}

th,
td {
  border-bottom: 1px solid #edf2f7;
  padding: 10px;
  text-align: left;
}

th {
  background: #f8fafc;
}

.log-table-scroll th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.empty,
.error {
  color: #991b1b;
}

.status-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.status-swatch {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 4px;
}

@media (max-width: 1100px) {
  .grid,
  .filters {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .panel-header div:first-child {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
