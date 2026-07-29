<template>
  <main class="timeline-page">
    <section class="filters">
      <label>
        Khu vực
        <select v-model="selectedLocationId" @change="handleLocationFilterChange">
          <option value="">Tất cả khu vực</option>
          <option v-for="location in locations" :key="location.location_id" :value="location.location_id">
            {{ location.location_name }}
          </option>
        </select>
      </label>
      <label>
        Máy
        <select v-model="selectedMachineId" @change="handleTimelineFilterChange">
          <option value="">Chọn máy</option>
          <option v-for="machine in machines" :key="machine._id" :value="machine._id">
            {{ machine.code }} - {{ machine.name }}
          </option>
        </select>
      </label>
      <label>
        Ngày
        <input v-model="selectedDate" type="date" @change="handleTimelineFilterChange" />
      </label>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="timeline-panel">
      <div class="timeline-meta">
        <div>
          <strong>{{ displayDate }}</strong>
          <span>{{ selectedMachine?.code || '-' }} - {{ selectedMachine?.name || 'Chọn máy' }}</span>
        </div>
        <span>Ghi nhận đến {{ formatTime(timelineFillEnd) }}</span>
      </div>

      <div class="timeline-scale" aria-hidden="true">
        <span v-for="tick in axisTicks" :key="tick.label">{{ tick.label }}</span>
      </div>

      <div class="timeline-track">
        <div
          v-for="segment in displaySegments"
          :key="`${segment.from}-${segment.to}-${segment.status_id || 'none'}`"
          class="timeline-segment"
          :class="{ 'is-nodata': isNoDataStatusId(segment.status_id) }"
          :style="{
            left: `${segment.leftPercent}%`,
            width: `${segment.widthPercent}%`,
            backgroundColor: segment.color,
            color: segment.textColor
          }"
          :title="segmentTitle(segment)"
        >
          <span v-if="segment.widthPercent >= 8">{{ segment.status_name }}</span>
        </div>
      </div>

      <p v-if="!loading && displayMarkers.length === 0" class="empty">Không có thay đổi trạng thái trong ngày này.</p>
    </section>

    <section class="summary-grid">
      <article v-for="item in statusSummary" :key="item.statusKey" class="summary-item">
        <span class="status-dot" :style="{ backgroundColor: item.color }"></span>
        <div>
          <strong>{{ item.status_name }}</strong>
          <span>{{ item.durationText }}</span>
        </div>
      </article>
    </section>

    <section class="event-list">
      <header class="event-list-header">
        <div>
          <h2>Lịch sử trạng thái</h2>
          <span>{{ eventPaginationText }}</span>
        </div>

        <div class="pagination-controls">
          <button type="button" :disabled="!canGoPreviousEventPage" @click="changeEventPage(eventPage - 1)">
            Trước
          </button>
          <button type="button" :disabled="!canGoNextEventPage" @click="changeEventPage(eventPage + 1)">
            Sau
          </button>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="displayMarkers.length === 0">
            <td colspan="3" class="empty">Chưa có lịch sử trạng thái trong ngày.</td>
          </tr>
          <tr v-for="marker in paginatedMarkers" :key="marker._id">
            <td>{{ formatTimeOnly(marker.createdAt) }}</td>
            <td>
              <span class="status-label">
                <span class="status-dot" :style="{ backgroundColor: marker.color }"></span>
                {{ marker.status_name }}
              </span>
            </td>
            <td>{{ marker.description || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getLocations } from '@/api/locations.api'
import { getMachines, getMachineStatusTimeline } from '@/api/machines.api'
import { isNoDataStatusId } from '@/constants/machine-status'
import {
  offMachineLogCreated,
  offMachineStatusUpdated,
  onMachineLogCreated,
  onMachineStatusUpdated
} from '@/services/socket.service'

const machines = ref([])
const locations = ref([])
const selectedLocationId = ref('')
const selectedMachineId = ref('')
const selectedDate = ref(todayInputValue())
const timeline = ref(null)
const loading = ref(false)
const error = ref('')
const eventPage = ref(1)
const EVENT_PAGE_SIZE = 8
const MACHINE_DROPDOWN_LIMIT = 100
const AXIS_HOURS = [0, 6, 12, 18, 24]
const currentTime = ref(new Date())
let clockTimer = null

const selectedMachine = computed(() => machines.value.find((machine) => machine._id === selectedMachineId.value) || null)
const timelineFillEnd = computed(() => {
  const latestSegmentEnd = displaySegments.value.reduce((latest, segment) => {
    const segmentEnd = parseTime(segment.to)

    return segmentEnd === null ? latest : Math.max(latest, segmentEnd)
  }, 0)

  if (latestSegmentEnd) {
    return new Date(latestSegmentEnd).toISOString()
  }

  return timeline.value?.filledTo || timeline.value?.to
})
const displayDate = computed(() => {
  if (!selectedDate.value) return '-'

  return new Date(`${selectedDate.value}T00:00:00`).toLocaleDateString('vi-VN')
})
const axisTicks = computed(() =>
  AXIS_HOURS.map((hour) => ({
    label: hour === 24 ? '24:00' : `${String(hour).padStart(2, '0')}:00`
  }))
)
const displaySegments = computed(() => buildDisplaySegments().map(withTimelinePercent))
const displayMarkers = computed(() =>
  [...(timeline.value?.markers || [])].sort((first, second) => {
    const firstTime = new Date(first.createdAt || first.updatedAt || 0).getTime()
    const secondTime = new Date(second.createdAt || second.updatedAt || 0).getTime()

    return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime)
  })
)
const eventTotalPages = computed(() => Math.max(Math.ceil(displayMarkers.value.length / EVENT_PAGE_SIZE), 1))
const paginatedMarkers = computed(() => {
  const start = (eventPage.value - 1) * EVENT_PAGE_SIZE

  return displayMarkers.value.slice(start, start + EVENT_PAGE_SIZE)
})
const eventPaginationText = computed(() => {
  const total = displayMarkers.value.length

  if (!total) {
    return '0'
  }

  const start = (eventPage.value - 1) * EVENT_PAGE_SIZE + 1
  const end = Math.min(eventPage.value * EVENT_PAGE_SIZE, total)

  return `${start} - ${end} / ${total} mốc`
})
const canGoPreviousEventPage = computed(() => eventPage.value > 1)
const canGoNextEventPage = computed(() => eventPage.value < eventTotalPages.value)
const statusSummary = computed(() => {
  const summary = new Map()

  for (const segment of displaySegments.value) {
    const key = segment.status_id || 'none'
    const existing = summary.get(key) || {
      statusKey: key,
      status_name: segment.status_name,
      color: segment.color,
      durationMs: 0
    }

    existing.durationMs += segment.durationMs
    summary.set(key, existing)
  }

  return [...summary.values()].map((item) => ({
    ...item,
    durationText: formatDuration(item.durationMs)
  }))
})

// Đổi máy/ngày thì tải lại timeline.
async function handleTimelineFilterChange() {
  eventPage.value = 1
  await loadTimeline()
}

// Đổi khu vực thì tải lại danh sách máy.
async function handleLocationFilterChange() {
  eventPage.value = 1
  await loadMachines()
  await loadTimeline()
}

// Chuyển trang lịch sử.
function changeEventPage(page) {
  if (page < 1 || page > eventTotalPages.value) {
    return
  }

  eventPage.value = page
}

// Ngày hiện tại cho input date.
function todayInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

// Tạo khoảng 00:00-24:00 của ngày chọn.
function dayRange(dateValue) {
  const from = new Date(`${dateValue}T00:00:00`)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)

  return {
    from: from.toISOString(),
    to: to.toISOString()
  }
}

// Tổng thời lượng trục timeline.
function timelineTotalMs() {
  if (!timeline.value?.from || !timeline.value?.to) {
    return 1
  }

  return Math.max(new Date(timeline.value.to).getTime() - new Date(timeline.value.from).getTime(), 1)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function parseTime(value) {
  if (!value) {
    return null
  }

  const time = new Date(value).getTime()

  return Number.isNaN(time) ? null : time
}

function displayEndTime() {
  if (!timeline.value?.from || !timeline.value?.to) {
    return null
  }

  const rangeStart = parseTime(timeline.value.from)
  const rangeEnd = parseTime(timeline.value.to)
  const now = currentTime.value.getTime()

  if (rangeStart === null || rangeEnd === null) {
    return null
  }

  return clamp(now, rangeStart, rangeEnd)
}

function statusTime(status) {
  return parseTime(status?.createdAt || status?.created_at || status?.updatedAt || status?.updated_at)
}

function statusName(status) {
  if (isNoDataStatusId(status?.status_id)) {
    return 'Chưa có dữ liệu'
  }

  return status?.status_name || status?.name || status?.currentStatus?.status_name || '-'
}

function statusColor(status) {
  return status?.color || status?.color_code || status?.status_color || '#6B7280'
}

function latestStatusBefore(endTime) {
  const statuses = [timeline.value?.previousStatusLog, ...(timeline.value?.markers || [])]
    .filter(Boolean)
    .map((status) => ({
      ...status,
      statusTime: statusTime(status)
    }))
    .filter((status) => status.statusTime !== null && status.statusTime <= endTime)

  return statuses.sort((first, second) => second.statusTime - first.statusTime)[0] || null
}

function buildDisplaySegments() {
  if (!timeline.value?.from || !timeline.value?.to) {
    return []
  }

  const rangeStart = parseTime(timeline.value.from)
  const rangeEnd = parseTime(timeline.value.to)
  const endTime = displayEndTime()

  if (rangeStart === null || rangeEnd === null || endTime === null) {
    return timeline.value?.segments || []
  }

  const segments = [...(timeline.value?.segments || [])]
  const lastStatus = latestStatusBefore(endTime)

  if (!lastStatus) {
    return segments
  }

  const latestSegmentEnd = segments.reduce((latest, segment) => {
    const segmentEnd = parseTime(segment.to)

    return segmentEnd === null ? latest : Math.max(latest, segmentEnd)
  }, rangeStart)
  const segmentStart = clamp(Math.max(lastStatus.statusTime, latestSegmentEnd), rangeStart, rangeEnd)
  const segmentEnd = clamp(endTime, segmentStart, rangeEnd)

  if (segmentEnd <= segmentStart) {
    return segments
  }

  return [
    ...segments,
    {
      status_id: lastStatus.status_id,
      status_name: statusName(lastStatus),
      color: statusColor(lastStatus),
      from: new Date(segmentStart).toISOString(),
      to: new Date(segmentEnd).toISOString(),
      durationMs: segmentEnd - segmentStart
    }
  ]
}

function readableTextColor(hexColor) {
  const hex = String(hexColor || '').replace('#', '')

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return '#ffffff'
  }

  const red = parseInt(hex.slice(0, 2), 16)
  const green = parseInt(hex.slice(2, 4), 16)
  const blue = parseInt(hex.slice(4, 6), 16)
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000

  return brightness > 160 ? '#111827' : '#ffffff'
}

// Tính vị trí và độ rộng segment.
function withTimelinePercent(item) {
  const rangeStart = new Date(timeline.value.from).getTime()
  const rangeEnd = new Date(timeline.value.to).getTime()
  const total = timelineTotalMs()
  const rawStart = new Date(item.from || item.createdAt).getTime()
  const rawEnd = item.to ? new Date(item.to).getTime() : rawStart
  const itemStart = clamp(Number.isNaN(rawStart) ? rangeStart : rawStart, rangeStart, rangeEnd)
  const itemEnd = clamp(Number.isNaN(rawEnd) ? itemStart : rawEnd, itemStart, rangeEnd)
  const widthPercent = item.to ? Math.max(((itemEnd - itemStart) / total) * 100, 0.25) : 0

  return {
    ...item,
    leftPercent: ((itemStart - rangeStart) / total) * 100,
    widthPercent,
    textColor: readableTextColor(item.color)
  }
}

// Format ngày giờ đầy đủ.
function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('vi-VN')
}

// Format giờ.
function formatTimeOnly(value) {
  if (!value) return '-'
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('vi-VN')
}

// Format giờ/phút.
function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// Format thời lượng.
function formatDuration(durationMs) {
  const totalMinutes = Math.round(durationMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours && minutes) return `${hours} giờ ${minutes} phút`
  if (hours) return `${hours} giờ`

  return `${minutes} phút`
}

// Tooltip cho segment.
function segmentTitle(segment) {
  return `${segment.status_name}: ${formatTime(segment.from)} - ${formatTime(segment.to)} (${formatDuration(segment.durationMs)})`
}

// Kiểm tra event thuộc máy đang xem.
function isSelectedMachineEvent(event) {
  const payload = event?.log || event?.data || event

  return (
    String(payload?.machineId ?? event?.machineId) === String(selectedMachineId.value) ||
    String(payload?.machineCode ?? event?.machineCode) === String(selectedMachine.value?.code)
  )
}

// Kiểm tra event thuộc ngày đang xem.
function isSelectedDayEvent(event) {
  const range = dayRange(selectedDate.value)
  const changedAt = new Date(event?.updatedAt || event?.createdAt || event?.log?.createdAt || Date.now()).getTime()

  return changedAt >= new Date(range.from).getTime() && changedAt < new Date(range.to).getTime()
}

// Tải máy cho dropdown.
async function loadMachines() {
  const response = await getMachines({
    location_id: selectedLocationId.value,
    limit: MACHINE_DROPDOWN_LIMIT,
    sortBy: 'code',
    sortOrder: 'asc'
  })
  machines.value = response.data || []

  const selectedMachineStillVisible = machines.value.some((machine) => machine._id === selectedMachineId.value)

  if (!selectedMachineStillVisible) {
    selectedMachineId.value = machines.value[0]?._id || ''
  }
}

// Tải khu vực cho filter.
async function loadLocations() {
  const response = await getLocations()
  locations.value = response.data || []
}

// Tải timeline hiện tại.
async function loadTimeline() {
  if (!selectedMachineId.value || !selectedDate.value) {
    timeline.value = null
    return
  }

  try {
    loading.value = true
    error.value = ''
    const response = await getMachineStatusTimeline(selectedMachineId.value, dayRange(selectedDate.value))
    timeline.value = response.data
    eventPage.value = Math.min(eventPage.value, eventTotalPages.value)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Reload khi trạng thái đổi.
async function handleRealtimeStatus(event) {
  if (isSelectedMachineEvent(event) && isSelectedDayEvent(event)) {
    await loadTimeline()
  }
}

// Reload khi có log mới.
async function handleRealtimeLog(event) {
  if (isSelectedMachineEvent(event) && isSelectedDayEvent(event)) {
    await loadTimeline()
  }
}

onMounted(async () => {
  try {
    clockTimer = setInterval(() => {
      currentTime.value = new Date()
    }, 60000)
    await Promise.all([loadLocations(), loadMachines()])
    await loadTimeline()
    onMachineStatusUpdated(handleRealtimeStatus)
    onMachineLogCreated(handleRealtimeLog)
  } catch (err) {
    error.value = err.message
  }
})

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
  }

  offMachineStatusUpdated(handleRealtimeStatus)
  offMachineLogCreated(handleRealtimeLog)
})
</script>

<style scoped>
.timeline-page {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 100vh;
  padding: 14px 18px;
  background: #f8fafc;
  color: #111827;
}

.page-header,
.filters,
.timeline-panel,
.event-list,
.summary-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 30px;
}

h2 {
  font-size: 20px;
}

.page-header p,
.timeline-meta span,
.summary-item span,
dt {
  color: #6b7280;
}

.filters select,
.filters input {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
}

.filters {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(220px, 1fr) 220px;
  gap: 10px;
  padding: 12px 16px;
}

label {
  display: grid;
  gap: 4px;
  font-weight: 700;
}

.timeline-panel {
  display: grid;
  gap: 12px;
  padding: 14px 16px 16px;
}

.timeline-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.timeline-meta div {
  display: grid;
  gap: 3px;
}

.timeline-meta strong {
  font-size: 18px;
}

.timeline-scale {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #6b7280;
  font-size: 12px;
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 44px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
}

.timeline-segment {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  min-width: 1px;
  padding: 0 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  white-space: nowrap;
}

.timeline-segment.is-nodata {
  background-image:
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.16) 0,
      rgba(255, 255, 255, 0.16) 8px,
      transparent 8px,
      transparent 16px
    );
}

.status-dot {
  display: block;
  border-radius: 999px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 10px 14px;
}

.summary-item .status-dot {
  width: 12px;
  height: 12px;
}

.summary-item div {
  display: grid;
  gap: 3px;
}

.event-list {
  display: grid;
  gap: 8px;
  padding: 12px 16px;
}

.event-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.event-list-header div:first-child {
  display: flex;
  align-items: center;
  gap: 10px;
}

.event-list-header span {
  color: #64748b;
  font-size: 13px;
}

.pagination-controls {
  display: flex;
  gap: 8px;
}

.pagination-controls button {
  height: 30px;
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

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid #edf2f7;
  padding: 7px 10px;
  text-align: left;
  line-height: 1.25;
}

th {
  background: #f8fafc;
}

td:first-child {
  white-space: nowrap;
  font-weight: 700;
}

.status-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.status-label .status-dot {
  width: 12px;
  height: 12px;
}

.empty,
.error {
  color: #991b1b;
}

@media (max-width: 900px) {
  .page-header,
  .timeline-meta {
    align-items: stretch;
    flex-direction: column;
  }

  .filters,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .event-list-header,
  .event-list-header div:first-child {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
