<template>
  <main class="home-page">
    <header class="page-header">
      <div>
               <p>Tổng quan trạng thái máy theo nhà máy.</p>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="kpi-grid">
      <article class="kpi-card is-total">
        <span>Tổng máy</span>
        <strong>{{ totals.total }}</strong>
      </article>
      <article class="kpi-card is-location">
        <span>Khu vực</span>
        <strong>{{ totals.locationCount }}</strong>
      </article>
      <article
        v-for="status in statusCards"
        :key="status.key"
        class="kpi-card"
        :style="{ borderColor: status.color, backgroundColor: translucent(status.color, 0.12) }"
      >
        <span>{{ status.name }}</span>
        <strong :style="{ color: status.color }">{{ status.count }}</strong>
      </article>
    </section>

    <section class="home-panel">
      <header class="panel-header">
        <div>
          <h2>Tổng quan: {{ overviewText }}</h2>
        </div>
        <RouterLink class="panel-link" to="/machines/monitoring">
          <i class="fas fa-chart-line" aria-hidden="true"></i>
          <span>Xem giám sát</span>
        </RouterLink>
      </header>

      <p v-if="loading && !hasDashboardData" class="empty">Đang tải dữ liệu...</p>
      <p v-else-if="locationOverview.length === 0" class="empty">Chưa có dữ liệu nhà máy.</p>

      <div v-else class="area-grid">
        <article
          v-for="area in locationOverview"
          :key="area.location.location_id || area.location.location_name"
          class="area-card"
          :class="areaHealthClass(area)"
        >
          <header>
            <div>
              <h3>{{ area.location.location_name }}</h3>
              <span>
                {{ area.counts.total }} máy
                <span class="area-online-count" :style="{ backgroundColor: onlineStatusColor }">{{ areaOnlineCount(area) }} online</span>
                <span
                  v-if="areaOfflineCount(area) > 0"
                  class="area-offline-count"
                  :style="{ backgroundColor: offlineStatusColor }"
                >{{ areaOfflineCount(area) }} offline</span>
              </span>
            </div>
            <RouterLink class="detail-link" :to="`/machines/monitoring?location_id=${area.location.location_id}`">
              <i class="fas fa-external-link-alt" aria-hidden="true"></i>
              <span>Xem chi tiết</span>
            </RouterLink>
          </header>

          <div class="area-status-bar" aria-hidden="true">
            <span
              v-for="status in areaStatusItems(area)"
              :key="status.key"
              :style="{ width: `${status.widthPercent}%`, backgroundColor: status.color }"
              :title="`${status.name}: ${status.count}`"
            ></span>
          </div>

          <div class="area-counts">
            <span
              v-for="status in areaCountItems(area)"
              :key="`count-${status.key}`"
              class="area-count"
              :class="{ 'is-empty': status.count === 0 }"
            >
              <i :style="{ backgroundColor: status.color }" aria-hidden="true"></i>
              <span>{{ status.name }}</span>
              <strong>{{ status.count }}</strong>
            </span>
          </div>

          <div class="machine-chip-grid">
            <p v-if="area.machines.length === 0" class="area-empty">Chưa có máy</p>
            <RouterLink
              v-for="machine in area.machines"
              :key="machine._id"
              class="machine-chip"
              :to="`/machines/${machine._id}`"
              :style="{ borderColor: machineStatusColor(machine) }"
              :title="`${machine.name} - ${machineStatusName(machine)} - Kết nối: ${machineConnectionName(machine)}`"
            >
              <div class="machine-chip-top">
                <span class="machine-connection-badge" :style="{ backgroundColor: machineConnectionColor(machine) }">{{ machineConnectionName(machine) }}</span>
              </div>
              <div class="machine-chip-bottom">
                <strong>{{ machine.name }}</strong>
                <small>{{ machineStatusName(machine) }}</small>
              </div>
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { getBackendHealth, getLocationOverview } from '@/api/machines.api'
import { getMachineConnectionStatuses } from '@/api/machineConnectionStatuses.api'
import { getStatuses } from '@/api/statuses.api'
import {
  offMachineConnectionUpdated,
  offMachineLogCreated,
  offMachineStatusUpdated,
  onMachineConnectionUpdated,
  onMachineLogCreated,
  onMachineStatusUpdated
} from '@/services/socket.service'

const NO_DATA_STATUS_CARD = {
  key: 'noData',
  statusId: '0',
  fallbackName: 'Chưa có dữ liệu',
  fallbackColor: '#6B7280'
}
const MQTT_CONNECTED_STATUSES = new Set(['connected', 'subscribed'])

const locationOverview = ref([])
const totals = ref(emptyTotals())
const statuses = ref([])
const connectionStatuses = ref([])
const connectionSync = ref(emptyConnectionSync())
const loading = ref(false)
const error = ref('')
let refreshTimer = null
let realtimeHandlersBound = false

const hasDashboardData = computed(() => locationOverview.value.length > 0 || totals.value.total > 0)
const overviewText = computed(() => `${totals.value.locationCount} nhà máy - ${totals.value.total} máy`)
const statusDefinitions = computed(() => [
  ...statuses.value.map((status) => ({
    key: `status-${status.status_id}`,
    statusId: String(status.status_id),
    fallbackName: status.status_name,
    fallbackColor: status.color_code || status.color || '#6B7280'
  })),
  NO_DATA_STATUS_CARD
])
const onlineStatusColor = computed(() => connectionColor('1'))
const offlineStatusColor = computed(() => connectionColor('2'))
const statusCards = computed(() =>
  statusDefinitions.value.map((status) => ({
    ...status,
    name: statusName(status),
    color: statusColor(status),
    count: totalForStatus(status)
  }))
)

function emptyTotals() {
  return {
    locationCount: 0,
    total: 0,
    online: 0,
    pending: 0,
    error: 0,
    offline: 0,
    other: 0,
    noData: 0,
    connection: emptyConnectionTotals(),
    byStatus: {}
  }
}

function emptyConnectionTotals() {
  return {
    total: 0,
    online: 0,
    offline: 0,
    other: 0,
    byConnectId: {}
  }
}

function emptyConnectionSync() {
  return {
    checked: false,
    connected: false,
    connect_id: '',
    connectionStatus: null,
    mqtt: null,
    matchedCount: 0,
    modifiedCount: 0,
    updatedAt: ''
  }
}

function statusMeta(statusId) {
  return statuses.value.find((status) => String(status.status_id) === String(statusId)) || null
}

function statusName(status) {
  return statusMeta(status.statusId)?.status_name || status.fallbackName
}

function statusColor(status) {
  const meta = statusMeta(status.statusId)

  return meta?.color_code || meta?.color || status.fallbackColor || '#6B7280'
}

function totalForStatus(status) {
  const statusId = String(status.statusId)

  if (statusId === NO_DATA_STATUS_CARD.statusId) {
    return Number(totals.value.byStatus?.[statusId]) || Number(totals.value.noData) || 0
  }

  return Number(totals.value.byStatus?.[statusId]) || 0
}

function machineStatusName(machine) {
  return machine.currentStatus?.status_name || 'Chưa có dữ liệu'
}

function machineStatusColor(machine) {
  return machine.currentStatus?.color_code || machine.currentStatus?.color || '#6B7280'
}

function connectionStatusMeta(connectId) {
  return connectionStatuses.value.find((status) => String(status.connect_id) === String(connectId)) || null
}

function fallbackConnectionStatus(connectId) {
  return {
    connect_id: String(connectId),
    connect_desc: String(connectId) === '2' ? 'Offline' : 'Online',
    color_code: String(connectId) === '2' ? '#6B7280' : '#16A34A'
  }
}

function connectionStatus(connectId) {
  return connectionStatusMeta(connectId) || fallbackConnectionStatus(connectId)
}

function connectionColor(connectId) {
  const status = connectionStatus(connectId)

  return status.color_code || status.color || fallbackConnectionStatus(connectId).color_code
}

function machineConnectionStatus(machine) {
  return machine.connectionStatus || connectionStatus(machine.connect_id || '1')
}

function machineConnectionName(machine) {
  return machineConnectionStatus(machine).connect_desc
}

function machineConnectionColor(machine) {
  const status = machineConnectionStatus(machine)

  return status.color_code || status.color || connectionColor(machine.connect_id || '1')
}

// Build a theme-aware translucent status background for KPI cards.
function translucent(hexColor, alpha) {
  const color = String(hexColor || '').trim()
  const percent = Math.round(Number(alpha) * 100)

  if (!/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color) || !Number.isFinite(percent)) {
    return 'color-mix(in srgb, var(--muted-color) 12%, var(--surface-bg))'
  }

  return `color-mix(in srgb, ${color} ${percent}%, var(--surface-bg))`
}

// Chỉ lấy trạng thái có máy (count > 0) để vẽ thanh tỉ lệ area-status-bar.
function areaStatusItems(area) {
  return buildAreaStatusItems(area).filter((status) => status.count > 0)
}

// Lấy đủ mọi trạng thái (kể cả count = 0) để hiện danh sách area-counts.
function areaCountItems(area) {
  return buildAreaStatusItems(area)
}

// Gộp số lượng máy theo từng trạng thái của 1 khu vực.
function buildAreaStatusItems(area) {
  const total = Number(area.counts?.total) || 0

  return statusDefinitions.value.map((status) => {
    const statusId = String(status.statusId)
    const count =
      statusId === NO_DATA_STATUS_CARD.statusId
        ? Number(area.countsByStatus?.[statusId]) || Number(area.counts?.noData) || 0
        : Number(area.countsByStatus?.[statusId]) || 0

    return {
      ...status,
      name: statusName(status),
      color: statusColor(status),
      count,
      widthPercent: total ? Math.max((count / total) * 100, count > 0 ? 2 : 0) : 0
    }
  })
}

function machineIsOnline(machine) {
  return machineConnectionName(machine) === 'Online'
}

function areaOnlineCount(area) {
  return (area.machines || []).filter(machineIsOnline).length
}

function areaOfflineCount(area) {
  return (area.machines || []).filter((machine) => !machineIsOnline(machine)).length
}

function areaHealthClass(area) {
  if (area.counts.error > 0) return 'is-danger'
  if (area.counts.pending > 0) return 'is-warning'
  if (area.counts.noData > 0) return 'is-muted'

  return 'is-healthy'
}

async function loadStatuses() {
  const response = await getStatuses()
  statuses.value = response.data || []
}

async function loadConnectionStatuses() {
  const response = await getMachineConnectionStatuses()
  connectionStatuses.value = response.data || []
}

function normalizeConnectionSync(data = {}) {
  return {
    ...emptyConnectionSync(),
    ...data,
    checked: true,
    connected: Boolean(data.connected)
  }
}

function isMqttConnectedStatus(status) {
  return MQTT_CONNECTED_STATUSES.has(String(status || '').toLowerCase())
}

async function loadDashboard() {
  try {
    if (!hasDashboardData.value) {
      loading.value = true
    }

    error.value = ''
    const [healthResponse, response] = await Promise.all([
      getBackendHealth(),
      getLocationOverview()
    ])
    const mqtt = healthResponse.data?.mqtt || null
    connectionSync.value = normalizeConnectionSync({
      connected: isMqttConnectedStatus(mqtt?.status),
      mqtt
    })
    locationOverview.value = normalizeLocationOverview(response.data || [])
    totals.value = response.totals || emptyTotals()
  } catch (err) {
    connectionSync.value = {
      ...emptyConnectionSync(),
      checked: true,
      mqtt: {
        status: 'error',
        lastError: err.message
      }
    }
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Debounce 300ms: nhiều event realtime dồn dập chỉ cần reload dashboard 1 lần.
function scheduleDashboardReload() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  refreshTimer = setTimeout(() => {
    refreshTimer = null
    loadDashboard()
  }, 300)
}

function normalizeLocationOverview(areas) {
  return [...areas]
    .map((area) => ({
      ...area,
      machines: [...(area.machines || [])].sort(compareMachineByConnectionStatusThenCode)
    }))
    .sort(compareAreaByName)
}

function compareAreaByName(left, right) {
  return String(left.location?.location_name || '').localeCompare(String(right.location?.location_name || ''), 'vi', {
    numeric: true,
    sensitivity: 'base'
  })
}

function compareMachineByCode(left, right) {
  return String(left.code || '').localeCompare(String(right.code || ''), 'vi', {
    numeric: true,
    sensitivity: 'base'
  })
}

function machineConnectionRank(machine) {
  const connectionName = String(machineConnectionName(machine) || '').toLowerCase()

  if (connectionName === 'offline') return 0
  if (connectionName === 'online') return 1

  return 2
}

function machineStatusRank(machine) {
  const statusId = String(machine.currentStatus?.status_id ?? '').trim()

  if (statusId === '3') return 0
  if (statusId === '2') return 1
  if (statusId === '1') return 2
  if (statusId === '' || statusId === NO_DATA_STATUS_CARD.statusId) return 3

  return 4
}

// Thứ tự ưu tiên trong từng nhà máy:
// Offline -> Online; trong mỗi nhóm kết nối: Lỗi -> Tạm dừng -> Đang chạy -> Không có dữ liệu.
function compareMachineByConnectionStatusThenCode(left, right) {
  const connectionDiff = machineConnectionRank(left) - machineConnectionRank(right)

  if (connectionDiff !== 0) {
    return connectionDiff
  }

  const statusDiff = machineStatusRank(left) - machineStatusRank(right)

  if (statusDiff !== 0) {
    return statusDiff
  }

  return compareMachineByCode(left, right)
}

function bindRealtimeHandlers() {
  if (realtimeHandlersBound) {
    return
  }

  onMachineLogCreated(scheduleDashboardReload)
  onMachineStatusUpdated(scheduleDashboardReload)
  onMachineConnectionUpdated(scheduleDashboardReload)
  realtimeHandlersBound = true
}

function unbindRealtimeHandlers() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }

  if (!realtimeHandlersBound) {
    return
  }

  offMachineLogCreated(scheduleDashboardReload)
  offMachineStatusUpdated(scheduleDashboardReload)
  offMachineConnectionUpdated(scheduleDashboardReload)
  realtimeHandlersBound = false
}

onMounted(async () => {
  await Promise.all([loadStatuses(), loadConnectionStatuses()])
  await loadDashboard()
  bindRealtimeHandlers()
})

onActivated(bindRealtimeHandlers)
onDeactivated(unbindRealtimeHandlers)

onUnmounted(unbindRealtimeHandlers)
</script>

<style scoped>
.home-page {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 100vh;
  padding: 24px 28px;
  background: var(--app-bg);
  color: var(--text-color);
}

.page-header,
.panel-header,
.area-card header,
.area-count {
  display: flex;
  align-items: center;
}

.page-header,
.panel-header,
.area-card header {
  justify-content: space-between;
  gap: 14px;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
  line-height: 1.15;
}

h2 {
  font-size: 18px;
}

h3 {
  color: var(--text-color);
  font-size: 17px;
  line-height: 1.2;
}

.page-header p,
.panel-header span,
.area-card header span:not(.area-online-count):not(.area-offline-count),
.machine-chip small {
  color: var(--muted-color);
}

.panel-link,
.detail-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 0 11px;
  background: var(--surface-muted);
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.panel-link:hover,
.detail-link:hover {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.kpi-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 72px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px 15px;
  background: var(--surface-bg);
}

.kpi-card span {
  color: var(--muted-color);
  font-weight: 800;
}

.kpi-card strong {
  color: var(--text-color);
  font-size: 26px;
  line-height: 1;
}

.kpi-card.is-total {
  border-color: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
}

.kpi-card.is-location {
  border-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 8%, var(--surface-bg));
}

.home-panel {
  display: grid;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px 16px;
  background: var(--surface-bg);
}

.area-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.area-card {
  display: grid;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-left: 5px solid var(--border-color);
  border-radius: 8px;
  padding: 13px;
  background: var(--surface-bg);
}

.area-card.is-healthy {
  border-left-color: #16a34a;
}

.area-card.is-warning {
  border-left-color: #eab308;
}

.area-card.is-danger {
  border-left-color: #dc2626;
}

.area-card.is-muted {
  border-left-color: var(--muted-color);
}

.area-online-count,
.area-offline-count {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.area-status-bar {
  display: flex;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-muted);
}

.area-status-bar span {
  min-width: 2px;
}

.area-counts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
  gap: 8px;
}

.area-count {
  justify-content: space-between;
  gap: 8px;
  min-height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 0 9px;
  background: var(--surface-muted);
  color: var(--text-color);
  font-size: 13px;
}

.area-count i {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.area-count span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.area-count.is-empty {
  opacity: 0.58;
}

.machine-chip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow: auto;
  padding-right: 2px;
}

.area-empty {
  grid-column: 1 / -1;
  padding: 10px 0;
  color: var(--muted-color);
  text-align: center;
}

.machine-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 52px;
  border: 1px solid var(--border-color);
  border-left-width: 4px;
  border-radius: 7px;
  padding: 8px 10px;
  background: var(--surface-bg);
  color: var(--text-color);
  text-decoration: none;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.machine-chip:hover {
  box-shadow: 0 2px 8px color-mix(in srgb, var(--text-color) 14%, transparent);
  transform: translateY(-1px);
}

.machine-chip-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.machine-chip-bottom {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.machine-status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.machine-connection-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.5;
  white-space: nowrap;
}

.machine-chip strong,
.machine-chip small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.machine-chip strong {
  font-size: 15px;
  line-height: 1.1;
}

.machine-chip small {
  font-size: 12px;
}

.empty,
.error {
  padding: 22px 12px;
  text-align: center;
}

.empty {
  color: var(--muted-color);
}

.error {
  color: var(--error-text);
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(4, minmax(120px, 1fr));
  }
}

@media (max-width: 900px) {
  .home-page {
    padding: 18px;
  }

  .page-header,
  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .kpi-grid,
  .area-grid {
    grid-template-columns: 1fr;
  }
}
</style>
