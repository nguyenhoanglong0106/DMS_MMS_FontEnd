<template>
  <main class="monitor-page">
    <header class="page-header">
      <div>
        <h1>Giám sát máy</h1>
        <p>
          <span :class="socketConnected ? 'online' : 'offline'">
            {{ socketConnected ? 'Socket.IO đã kết nối' : 'Socket.IO mất kết nối' }}
          </span>
          <span>{{ displayedTotalText }}</span>
        </p>
      </div>
      <button type="button" class="reload-button" @click="reload">
        <i class="fas fa-sync-alt" aria-hidden="true"></i>
        <span>Reload</span>
      </button>
    </header>

    <section class="control-panel">
      <input
        v-model.trim="machineStore.filters.keyword"
        type="search"
        placeholder="Tìm mã máy hoặc tên máy"
        @keyup.enter="reload"
      />

      <select v-model="machineStore.filters.location_id" @change="reload">
        <option value="">Tất cả khu vực</option>
        <option v-for="location in locations" :key="location.location_id" :value="location.location_id">
          {{ location.location_name }}
        </option>
      </select>

      <label class="stable-toggle">
        <input v-model="showStable" type="checkbox" />
        <span>Hiện máy ổn định</span>
      </label>

      <button type="button" class="secondary-button" @click="resetMonitoringFilters">Đặt lại</button>
    </section>

    <section class="status-strip">
      <article class="strip-item is-total">
        <span>Tổng máy</span>
        <strong>{{ machineStore.pagination.total || machineStore.machines.length }}</strong>
      </article>
      <article class="strip-item is-urgent">
        <span>Cần xử lý ngay</span>
        <strong>{{ urgentMachines.length }}</strong>
      </article>
      <article class="strip-item is-watch">
        <span>Cần theo dõi</span>
        <strong>{{ watchMachines.length }}</strong>
      </article>
      <article class="strip-item is-stable">
        <span>Đang ổn định</span>
        <strong>{{ stableMachines.length }}</strong>
      </article>
    </section>

    <section class="command-center">
      <section class="priority-panel">
        <header class="section-header">
          <div>
            <strong>Lưu ý</strong>
            <span>Lỗi, tạm dừng hoặc chưa có dữ liệu</span>
          </div>
          <b>{{ priorityMachines.length }}</b>
        </header>

        <p v-if="priorityMachines.length === 0" class="empty-state">
          Không có máy cần xử lý hoặc theo dõi.
        </p>

        <div v-else class="priority-list">
          <article
            v-for="machine in priorityMachines"
            :key="machine._id"
            class="priority-card"
            :class="{ 'is-highlighted': isHighlighted(machine) }"
            :style="{ '--status-color': machineStatusColor(machine), '--frame-color': tileFrameColor(machine) }"
          >
            <header>
              <div>
                <h2>{{ machine.code }}</h2>
                <span>{{ machine.name }}</span>
              </div>
              <div class="card-action">
                <MachineStatusBadge
                  :status-id="machine.currentStatus?.status_id"
                  :status-name="statusLabel(machine)"
                  :status-color="machineStatusColor(machine)"
                  size="sm"
                />
                <RouterLink :to="`/machines/${machine._id}`">Xem chi tiết</RouterLink>
              </div>
            </header>

            <dl>
              <div>
                <dt>Khu vực</dt>
                <dd>{{ locationName(machine) }}</dd>
              </div>
              <div>
                <dt>Tín hiệu cuối</dt>
                <dd>
                  <strong>{{ formatRelativeTime(lastSignalAt(machine)) }}</strong>
                  <span>{{ formatDate(lastSignalAt(machine)) }}</span>
                </dd>
              </div>
            </dl>

          </article>
        </div>
      </section>

      <aside class="event-panel">
        <header class="section-header">
          <div>
            <strong>Sự kiện mới nhất</strong>
            <span>{{ recentEventCountText }}</span>
          </div>
        </header>

        <p v-if="recentEvents.length === 0" class="empty-state">
          Chưa có sự kiện trạng thái.
        </p>

        <ul v-else class="event-list">
          <li v-for="event in recentEvents" :key="event.id">
            <span class="event-dot" :style="{ backgroundColor: event.color }" aria-hidden="true"></span>
            <div class="event-content">
              <p class="event-main">
                <strong>{{ event.machineCode }}</strong>
                <span>{{ event.text }}</span>
              </p>
              <small>{{ formatTimeOnly(event.createdAt) }}</small>
            </div>
          </li>
        </ul>
      </aside>
    </section>

    <section class="plant-board">
      <header class="section-header">
        <div>
          <strong>Lưới trạng thái máy</strong>
          <span>{{ gridSummaryText }}</span>
        </div>
        <div class="legend">
          <span v-for="status in legendStatuses" :key="status.key">
            <i :style="{ backgroundColor: status.color }" aria-hidden="true"></i>
            {{ status.label }}
          </span>
        </div>
      </header>

      <p v-if="locationGroups.length === 0" class="empty-state">
        Không có máy phù hợp với bộ lọc hiện tại.
      </p>

      <div v-else class="location-groups">
        <article v-for="group in locationGroups" :key="group.id" class="location-card">
          <header>
            <div>
              <strong>{{ group.name }}</strong>
              <span>{{ group.machines.length }} máy</span>
            </div>
            <small v-if="group.issueCount > 0" class="is-warning">{{ group.issueCount }} cần chú ý</small>
            <small v-else>Ổn định</small>
          </header>

          <div class="machine-grid">
            <RouterLink
              v-for="machine in group.machines"
              :key="machine._id"
              class="machine-tile"
              :class="{ 'is-highlighted': isHighlighted(machine), 'is-priority': laneForMachine(machine) !== 'stable' }"
              :style="{
                '--status-color': machineStatusColor(machine),
                '--tile-frame-color': tileFrameColor(machine),
                '--tile-bg-color': tileBackgroundColor(machine)
              }"
              :to="`/machines/${machine._id}`"
              :title="machineTooltip(machine)"
            >
              <span class="tile-dot" aria-hidden="true"></span>
              <strong>{{ machine.code }}</strong>
              <span>{{ compactStatusLabel(machine) }}</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getLocations } from '@/api/locations.api'
import { getStatuses } from '@/api/statuses.api'
import MachineStatusBadge from '@/components/machines/MachineStatusBadge.vue'
import {
  getSocket,
  offMachineLogCreated,
  offMachineStatusUpdated,
  onMachineLogCreated,
  onMachineStatusUpdated
} from '@/services/socket.service'
import { isNoDataStatusId } from '@/constants/machine-status'
import { useMachineStore } from '@/stores/machine.store'

const machineStore = useMachineStore()
const route = useRoute()
const locations = ref([])
const statuses = ref([])
const recentEvents = ref([])
const socketConnected = ref(false)
const showStable = ref(true)
const MONITORING_LIMIT = 100
let realtimeReloadTimer = null

const urgentMachines = computed(() => sortedByUrgency(machineStore.machines.filter((machine) => laneForMachine(machine) === 'urgent')))
const watchMachines = computed(() => sortedByUrgency(machineStore.machines.filter((machine) => laneForMachine(machine) === 'watch')))
const stableMachines = computed(() => sortedByUrgency(machineStore.machines.filter((machine) => laneForMachine(machine) === 'stable')))
const priorityMachines = computed(() => sortedByUrgency([...urgentMachines.value, ...watchMachines.value]))
const gridMachines = computed(() => (showStable.value ? machineStore.machines : priorityMachines.value))
const locationGroups = computed(() => {
  const groups = new Map()

  for (const machine of sortedByUrgency(gridMachines.value)) {
    const id = String(machine.location?.location_id || machine.location_id || 'no-location')
    const name = locationName(machine)

    if (!groups.has(id)) {
      groups.set(id, {
        id,
        name,
        issueCount: 0,
        machines: []
      })
    }

    const group = groups.get(id)
    group.machines.push(machine)

    if (laneForMachine(machine) !== 'stable') {
      group.issueCount += 1
    }
  }

  return [...groups.values()].sort((left, right) => {
    const issueDiff = right.issueCount - left.issueCount

    if (issueDiff !== 0) return issueDiff

    return left.name.localeCompare(right.name, 'vi')
  })
})

const displayedTotalText = computed(() => {
  const loaded = machineStore.machines.length
  const total = Number(machineStore.pagination.total) || loaded

  return loaded === total ? `${total} máy trong ca hiện tại` : `Đang hiển thị ${loaded}/${total} máy`
})
const recentEventCountText = computed(() => `${recentEvents.value.length} sự kiện`)

const gridSummaryText = computed(() => {
  const count = gridMachines.value.length
  const suffix = showStable.value ? 'đang hiển thị theo khu vực' : 'cần chú ý đang hiển thị'

  return `${count} máy ${suffix}`
})

const legendStatuses = computed(() => [
  { key: 'urgent', label: 'Cần xử lý', color: '#dc2626' },
  { key: 'watch', label: 'Cần theo dõi', color: '#d97706' },
  { key: 'stable', label: 'Ổn định', color: statusColor('1') },
  { key: 'no-data', label: 'Chưa dữ liệu', color: '#6B7280' }
])

function laneForMachine(machine) {
  const statusId = String(machine.currentStatus?.status_id ?? '')

  if (isNoDataStatusId(statusId) || statusId === '3') return 'urgent'
  if (statusId === '2') return 'watch'

  return 'stable'
}

function statusPriority(machine) {
  const statusId = String(machine.currentStatus?.status_id ?? '')

  if (isNoDataStatusId(statusId)) return 0
  if (statusId === '3') return 1
  if (statusId === '2') return 2

  return 3
}

function signalAge(machine) {
  const value = lastSignalAt(machine)
  const date = value ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER

  return Date.now() - date.getTime()
}

function sortedByUrgency(machines) {
  return [...machines].sort((left, right) => {
    const priorityDiff = statusPriority(left) - statusPriority(right)

    if (priorityDiff !== 0) return priorityDiff

    return signalAge(right) - signalAge(left)
  })
}

function eventPayload(event) {
  return event?.log || event?.data || event
}

function eventField(event, payload, fields) {
  for (const field of fields) {
    if (payload?.[field] !== undefined && payload?.[field] !== null) return payload[field]
    if (event?.[field] !== undefined && event?.[field] !== null) return event[field]
  }

  return undefined
}

function eventTime(event) {
  const time = new Date(event?.createdAt || 0).getTime()

  return Number.isNaN(time) ? 0 : time
}

function eventSignature(event) {
  return `${event.machineCode || '-'}-${event.createdAt || '-'}-${event.text || '-'}`
}

function normalizeRecentEvents(events) {
  const uniqueEvents = new Map()

  for (const event of events) {
    if (!event?.createdAt) {
      continue
    }

    const signature = eventSignature(event)

    if (!uniqueEvents.has(signature)) {
      uniqueEvents.set(signature, event)
    }
  }

  return [...uniqueEvents.values()].sort((first, second) => eventTime(second) - eventTime(first)).slice(0, 12)
}

function machineEventTime(machine) {
  return (
    machine.currentStatus?.updatedAt ||
    machine.currentStatus?.updated_at ||
    machine.lastUpdatedAt ||
    machine.updatedAt ||
    lastSignalAt(machine)
  )
}

function machineStatusEvent(machine) {
  const createdAt = machineEventTime(machine)

  if (!createdAt) {
    return null
  }

  return {
    id: `machine-${machine._id}-${machine.currentStatus?.status_id || 'none'}-${createdAt}`,
    machineCode: machine.code,
    text: statusLabel(machine),
    color: machineStatusColor(machine),
    createdAt
  }
}

function syncRecentEventsFromMachines() {
  const visibleMachineCodes = new Set(machineStore.machines.map((machine) => String(machine.code)))
  const visibleSessionEvents = recentEvents.value.filter((event) => visibleMachineCodes.has(String(event.machineCode)))
  const machineEvents = machineStore.machines.map(machineStatusEvent).filter(Boolean)

  recentEvents.value = normalizeRecentEvents([...visibleSessionEvents, ...machineEvents])
}

function addRecentEvent(event, fallbackText) {
  const payload = eventPayload(event)
  const statusColor =
    eventField(event, payload, ['colorCode', 'color_code', 'statusColor', 'status_color', 'color']) || '#0f62b4'
  const statusNameText = eventField(event, payload, ['statusName', 'status_name']) || fallbackText
  const machineCode = eventField(event, payload, ['machineCode', 'machine_code']) || payload?.machine?.code || '-'
  const createdAt =
    eventField(event, payload, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'timestamp']) ||
    new Date().toISOString()

  recentEvents.value = [
    {
      id: `realtime-${machineCode}-${createdAt}-${statusNameText}`,
      machineCode,
      text: statusNameText,
      color: statusColor,
      createdAt
    },
    ...recentEvents.value
  ]

  recentEvents.value = normalizeRecentEvents(recentEvents.value)
}

function scheduleRealtimeReload() {
  if (realtimeReloadTimer) {
    clearTimeout(realtimeReloadTimer)
  }

  realtimeReloadTimer = setTimeout(() => {
    realtimeReloadTimer = null
    loadMonitoringMachines()
  }, 800)
}

function handleRealtimeStatus(event) {
  machineStore.updateMachineStatusRealtime(event)
  addRecentEvent(event, 'Đổi trạng thái')
  scheduleRealtimeReload()
}

function handleRealtimeLog(event) {
  machineStore.updateMachineLogRealtime(event)
  addRecentEvent(event, 'Tín hiệu mới')
  scheduleRealtimeReload()
}

function bindSocketState() {
  const socket = getSocket()
  socketConnected.value = socket.connected
  socket.on('connect', () => {
    socketConnected.value = true
  })
  socket.on('disconnect', () => {
    socketConnected.value = false
  })
}

async function reload() {
  machineStore.pagination.page = 1
  machineStore.filters.status_id = ''
  machineStore.filters.noData = ''
  machineStore.filters.abnormal = ''
  await loadMonitoringMachines()
}

async function loadMonitoringMachines() {
  await machineStore.fetchMachines({ limit: MONITORING_LIMIT })
  syncRecentEventsFromMachines()
}

function statusMeta(statusId) {
  return statuses.value.find((status) => String(status.status_id) === String(statusId)) || null
}

function statusColor(statusId) {
  const meta = statusMeta(statusId)

  return meta?.color_code || meta?.color || '#6B7280'
}

function machineStatusColor(machine) {
  return machine.currentStatus?.color_code || machine.currentStatus?.color || statusColor(machine.currentStatus?.status_id)
}

function tileFrameColor(machine) {
  const lane = laneForMachine(machine)

  if (lane === 'urgent') return '#dc2626'
  if (lane === 'watch') return '#d97706'

  return '#16a34a'
}

function tileBackgroundColor(machine) {
  const lane = laneForMachine(machine)

  if (lane === 'urgent') return '#fff7f7'
  if (lane === 'watch') return '#fffbeb'

  return '#f0fdf4'
}

function statusLabel(machine) {
  return machine.currentStatus?.status_name || statusMeta(machine.currentStatus?.status_id)?.status_name || 'Chưa có dữ liệu'
}

function compactStatusLabel(machine) {
  const label = statusLabel(machine)

  return label.length > 12 ? `${label.slice(0, 12)}...` : label
}

function locationName(machine) {
  return machine.location?.location_name || machine.location_name || machine.location?.name || '-'
}

function lastSignalAt(machine) {
  return machine.lastSignalAt || machine.lastLog?.createdAt || machine.latestLog?.createdAt || machine.currentStatus?.lastSignalAt
}

function machineTooltip(machine) {
  return `${machine.code} - ${machine.name}\n${statusLabel(machine)}\nKhu vực: ${locationName(machine)}\nTín hiệu cuối: ${formatDate(lastSignalAt(machine))}`
}

async function resetMonitoringFilters() {
  machineStore.filters.keyword = ''
  machineStore.filters.location_id = ''
  await reload()
}

function isHighlighted(machine) {
  return machine.highlightedAt && Date.now() - machine.highlightedAt < 5000
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('vi-VN')
}

function formatTimeOnly(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('vi-VN')
}

function formatRelativeTime(value) {
  if (!value) return 'Chưa có tín hiệu'
  const date = new Date(value)
  const diffSeconds = Math.max(Math.floor((Date.now() - date.getTime()) / 1000), 0)

  if (Number.isNaN(date.getTime())) return '-'
  if (diffSeconds < 60) return `${diffSeconds} giây trước`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} phút trước`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`

  return `${Math.floor(diffHours / 24)} ngày trước`
}

onMounted(async () => {
  const [locationResponse, statusResponse] = await Promise.all([getLocations(), getStatuses()])
  locations.value = locationResponse.data || []
  statuses.value = statusResponse.data || []

  if (route.query.location_id) {
    machineStore.filters.location_id = String(route.query.location_id)
  }

  await reload()
  bindSocketState()
  onMachineLogCreated(handleRealtimeLog)
  onMachineStatusUpdated(handleRealtimeStatus)
})

onUnmounted(() => {
  if (realtimeReloadTimer) {
    clearTimeout(realtimeReloadTimer)
  }

  offMachineLogCreated(handleRealtimeLog)
  offMachineStatusUpdated(handleRealtimeStatus)
})
</script>

<style scoped>
.monitor-page {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 100vh;
  padding: 24px 28px;
  background: var(--app-bg);
  color: var(--text-color);
}

.page-header,
.control-panel,
.status-strip,
.section-header,
.stable-toggle {
  display: flex;
  align-items: center;
}

.page-header,
.section-header {
  justify-content: space-between;
  gap: 14px;
}

h1,
h2,
p,
dl {
  margin: 0;
}

h1 {
  font-size: 26px;
  line-height: 1.2;
}

.page-header p {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  color: var(--muted-color);
  font-size: 14px;
}

.online {
  color: #16a34a;
  font-weight: 800;
}

.offline {
  color: #dc2626;
  font-weight: 800;
}

.reload-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  padding: 0 14px;
  background: var(--primary-color);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

.secondary-button {
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--text-color);
}

.control-panel {
  gap: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  background: var(--surface-bg);
}

.control-panel input,
.control-panel select {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
}

.control-panel input {
  flex: 1;
  min-width: 220px;
}

.control-panel select {
  min-width: 170px;
}

.stable-toggle {
  gap: 8px;
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 10px;
  background: var(--surface-muted);
  color: var(--text-color);
  font-weight: 800;
  white-space: nowrap;
}

.stable-toggle input {
  width: 16px;
  height: 16px;
}

.status-strip {
  gap: 10px;
}

.strip-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  background: var(--surface-bg);
}

.strip-item span {
  color: var(--muted-color);
  font-weight: 800;
}

.strip-item strong {
  font-size: 24px;
  line-height: 1;
}

.strip-item.is-total {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.strip-item.is-urgent {
  border-color: #fecaca;
  background: #fff1f2;
}

.strip-item.is-urgent strong {
  color: #dc2626;
}

.strip-item.is-watch {
  border-color: #fde68a;
  background: #fffbeb;
}

.strip-item.is-watch strong {
  color: #d97706;
}

.strip-item.is-stable {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.strip-item.is-stable strong {
  color: #16a34a;
}

.command-center {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
  align-items: start;
}

.priority-panel,
.event-panel,
.plant-board,
.location-card {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
}

.section-header {
  min-height: 58px;
  padding: 11px 12px;
  border-bottom: 1px solid var(--border-color);
}

.section-header div {
  display: grid;
  gap: 3px;
}

.section-header strong {
  color: var(--text-color);
  font-size: 15px;
}

.section-header span {
  color: var(--muted-color);
  font-size: 13px;
}

.section-header b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #dc2626;
  color: #ffffff;
  font-size: 18px;
}

.priority-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  max-height: 250px;
  overflow: auto;
  padding: 10px;
  scrollbar-gutter: stable;
}

.priority-card {
  display: grid;
  gap: 9px;
  border: 1px solid var(--frame-color, var(--border-color));
  border-left: 5px solid var(--frame-color, #94a3b8);
  border-radius: 8px;
  padding: 10px 11px;
  background: var(--surface-bg);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.priority-card:hover,
.machine-tile:hover {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.priority-card.is-highlighted,
.machine-tile.is-highlighted {
  box-shadow: 0 0 0 3px rgba(15, 98, 180, 0.16);
}

.priority-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.priority-card h2 {
  color: var(--text-color);
  font-size: 20px;
  line-height: 1.1;
}

.priority-card header span {
  color: var(--muted-color);
  font-size: 13px;
}

.card-action {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.card-action a {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.card-action a:hover {
  text-decoration: underline;
}

.priority-card dl {
  display: grid;
  gap: 7px;
}

.priority-card dl div {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  gap: 8px;
}

.priority-card dt {
  color: var(--muted-color);
  font-size: 12px;
}

.priority-card dd {
  display: grid;
  gap: 2px;
  min-width: 0;
  margin: 0;
  color: var(--text-color);
  font-size: 13px;
  font-weight: 800;
}

.priority-card dd span {
  color: var(--muted-color);
  font-size: 12px;
  font-weight: 500;
}

.event-panel {
  align-self: start;
  display: grid;
}

.event-panel .section-header {
  min-height: 50px;
  padding: 9px 12px;
}

.event-list {
  display: grid;
  gap: 0;
  max-height: 218px;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  scrollbar-gutter: stable;
}

.event-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.event-dot {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
}

.event-content {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.event-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  line-height: 1.25;
}

.event-main strong,
.event-main span,
.event-content small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-list li small {
  color: var(--muted-color);
  font-size: 12px;
}

.plant-board {
  display: grid;
}

.section-header .legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.section-header .legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-color);
  font-size: 12px;
  font-weight: 700;
}

.section-header .legend i {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.location-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
  max-height: 240px;
  overflow: auto;
  padding: 10px;
  scrollbar-gutter: stable;
}

.location-card {
  display: grid;
  align-content: start;
  width: fit-content;
  min-width: 220px;
  max-width: min(100%, 520px);
  min-height: 0;
}

.location-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-muted);
}

.location-card > header div {
  display: grid;
  gap: 2px;
}

.location-card > header strong {
  color: var(--text-color);
  font-size: 15px;
}

.location-card > header span,
.location-card > header small {
  color: var(--muted-color);
  font-size: 12px;
}

.location-card > header small.is-warning {
  color: #dc2626;
  font-weight: 800;
}

.machine-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
}

.machine-tile {
  position: relative;
  display: grid;
  gap: 3px;
  width: 94px;
  min-height: 54px;
  border: 1px solid var(--tile-frame-color, var(--border-color));
  border-top: 4px solid var(--tile-frame-color, #94a3b8);
  border-radius: 8px;
  padding: 7px 9px;
  background: var(--tile-bg-color, var(--surface-bg));
  color: var(--text-color);
  text-decoration: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.machine-tile.is-priority {
  box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.06);
}

.tile-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--status-color, #94a3b8);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

.machine-tile strong {
  padding-right: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}

.machine-tile span:last-child {
  overflow: hidden;
  color: var(--muted-color);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
}

.empty-state {
  padding: 28px 12px;
  color: var(--muted-color);
  text-align: center;
}

.event-panel .empty-state {
  padding: 18px 12px;
}

@media (max-width: 1300px) {
  .command-center {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .monitor-page {
    padding: 18px;
  }

  .page-header,
  .control-panel,
  .status-strip,
  .section-header {
    align-items: stretch;
    flex-direction: column;
  }

  .control-panel input,
  .control-panel select {
    min-width: 0;
    width: 100%;
  }

  .location-groups {
    grid-template-columns: 1fr;
  }
}
</style>
