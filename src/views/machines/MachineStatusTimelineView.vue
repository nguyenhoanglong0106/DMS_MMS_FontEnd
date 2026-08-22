<template>
  <main class="timeline-page">
    <FilterRailLayout title="Timeline" :subtitle="timelineSubtitle" storage-key="machine-status-timeline">
      <template #dock>
        <label class="dock-field">
          <span>Khu vực</span>
          <select v-model="selectedLocationId" @change="handleLocationFilterChange">
            <option value="">Tất cả khu vực</option>
            <option v-for="location in locations" :key="location.location_id" :value="location.location_id">
              {{ location.location_name }}
            </option>
          </select>
        </label>
        <label class="dock-field">
          <span>Máy</span>
          <select v-model="selectedMachineId" @change="handleTimelineFilterChange">
            <option value="">Chọn máy</option>
            <option v-for="machine in machines" :key="machine._id" :value="machine._id">
              {{ machine.code }} - {{ machine.name }}
            </option>
          </select>
        </label>
        <label class="dock-field">
          <span>Từ ngày</span>
          <div class="date-input">
            <input
              v-model.trim="fromDate"
              type="text"
              inputmode="numeric"
              placeholder="dd/mm/yyyy"
              @blur="normalizeDateInput('fromDate')"
              @change="handleTimelineFilterChange"
              @keyup.enter="handleTimelineFilterChange"
            />
            <button
              type="button"
              class="date-picker-button"
              title="Chọn ngày"
              aria-label="Chọn từ ngày"
              @click="openDatePicker('fromDate')"
            >
              <i class="fas fa-calendar-alt" aria-hidden="true"></i>
            </button>
            <input
              :ref="(el) => setDatePickerRef('fromDate', el)"
              class="native-date-picker"
              type="date"
              :value="datePickerValue(fromDate)"
              tabindex="-1"
              aria-hidden="true"
              @change="selectDateFromPicker('fromDate', $event.target.value)"
            />
          </div>
        </label>
        <label class="dock-field">
          <span>Đến ngày</span>
          <div class="date-input">
            <input
              v-model.trim="toDate"
              type="text"
              inputmode="numeric"
              placeholder="dd/mm/yyyy"
              @blur="normalizeDateInput('toDate')"
              @change="handleTimelineFilterChange"
              @keyup.enter="handleTimelineFilterChange"
            />
            <button
              type="button"
              class="date-picker-button"
              title="Chọn ngày"
              aria-label="Chọn đến ngày"
              @click="openDatePicker('toDate')"
            >
              <i class="fas fa-calendar-alt" aria-hidden="true"></i>
            </button>
            <input
              :ref="(el) => setDatePickerRef('toDate', el)"
              class="native-date-picker"
              type="date"
              :value="datePickerValue(toDate)"
              tabindex="-1"
              aria-hidden="true"
              @change="selectDateFromPicker('toDate', $event.target.value)"
            />
          </div>
        </label>

        <div class="dock-section">
          <strong>Khung nhìn</strong>
          <span>{{ viewportLabel }}</span>
          <div class="dock-icon-actions">
            <button type="button" title="Thu nhỏ" @click="zoomOut">
              <i class="fas fa-search-minus" aria-hidden="true"></i>
            </button>
            <button type="button" title="Phóng to" @click="zoomIn">
              <i class="fas fa-search-plus" aria-hidden="true"></i>
            </button>
            <button type="button" title="Reload" @click="resetViewport">
              <i class="fas fa-sync-alt" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

    <section class="timeline-panel">
      <div class="timeline-meta">
        <div class="timeline-title">
          <strong>{{ displayRange }}</strong>
          <span>{{ selectedMachine?.code || '-' }} - {{ selectedMachine?.name || 'Chọn máy' }}</span>
        </div>
        <span class="timeline-pill">
          <i class="fas fa-clock" aria-hidden="true"></i>
          Ghi nhận
          <strong>{{ formatTimelineEndpoint(timelineFillEnd) }}</strong>
        </span>
      </div>

      <div class="timeline-scale" aria-hidden="true">
        <span v-for="tick in axisTicks" :key="tick.key" :style="{ left: `${tick.leftPercent}%` }">
          {{ tick.label }}
        </span>
      </div>

      <div class="timeline-track" @pointerdown="startTimelinePan" @wheel.prevent="handleTimelineWheel">
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
        <div
          v-if="selectedTimelineMarker"
          class="timeline-marker"
          :style="{ left: `${selectedTimelineMarker.leftPercent}%` }"
          :title="selectedTimelineMarker.title"
          aria-hidden="true"
        ></div>
      </div>

      <p v-if="!loading && displayMarkers.length === 0" class="empty">
        Không có thay đổi trạng thái trong khoảng thời gian này.
      </p>
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

      <DataGrid
        :columns="eventColumns"
        :rows="paginatedMarkers"
        :row-key="markerRowKey"
        storage-key="machine-status-timeline-events"
        empty-text="Chưa có lịch sử trạng thái trong khoảng thời gian."
      >
        <template #cell-status="{ row }">
          <span class="status-label">
            <span class="status-dot" :style="{ backgroundColor: row.color }"></span>
            {{ row.status_name }}
          </span>
        </template>
      </DataGrid>
    </section>
    </FilterRailLayout>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getLocations } from '@/api/locations.api'
import { getMachines, getMachineStatusTimeline } from '@/api/machines.api'
import DataGrid from '@/components/grid/DataGrid.vue'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'
import { isNoDataStatusId } from '@/constants/machine-status'
import {
  offMachineLogCreated,
  offMachineStatusUpdated,
  onMachineLogCreated,
  onMachineStatusUpdated
} from '@/services/socket.service'
import {
  formatDateFromInput,
  formatDateTime,
  formatDateHourMinute,
  formatDateOnly,
  formatHourMinute,
  formatTimeOnly
} from '@/utils/date-format'

const machines = ref([])
const locations = ref([])
const selectedLocationId = ref('')
const selectedMachineId = ref('')
const todayDateValue = todayInputValue()
const datePickerRefs = {}
const fromDate = ref(todayDateValue)
const toDate = ref(todayDateValue)
const timeline = ref(null)
const loading = ref(false)
const error = ref('')
const eventPage = ref(1)
const viewportStartPercent = ref(0)
const viewportEndPercent = ref(100)
const selectedTimelineMs = ref(null)
const EVENT_PAGE_SIZE = 8
const MACHINE_DROPDOWN_LIMIT = 100
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const VIEWPORT_MIN_MS = 5 * MINUTE_MS
const currentTime = ref(new Date())
let clockTimer = null
let dragState = null
const eventColumns = [
  { key: 'date', label: 'Ngày', value: (marker) => formatMarkerDate(marker.createdAt), width: 130 },
  { key: 'time', label: 'Thời gian', value: (marker) => formatTimeOnly(marker.createdAt), width: 120 },
  { key: 'status', label: 'Trạng thái', value: (marker) => marker.status_name || '-', width: 180 },
  { key: 'description', label: 'Mô tả', value: (marker) => marker.description || '-', width: 320 }
]

function markerRowKey(marker, index) {
  return marker._id || `${marker.createdAt || marker.updatedAt || 'marker'}-${index}`
}

const selectedMachine = computed(() => machines.value.find((machine) => machine._id === selectedMachineId.value) || null)
const timelineSubtitle = computed(() => {
  if (loading.value) {
    return 'Đang tải timeline...'
  }

  return selectedMachine.value
    ? `${selectedMachine.value.code} - ${selectedMachine.value.name}`
    : 'Chọn máy và khoảng ngày'
})
const timelineFillEnd = computed(() => {
  const latestSegmentEnd = buildDisplaySegments().reduce((latest, segment) => {
    const segmentEnd = parseTime(segment.to)

    return segmentEnd === null ? latest : Math.max(latest, segmentEnd)
  }, 0)

  if (latestSegmentEnd) {
    return new Date(latestSegmentEnd).toISOString()
  }

  return timeline.value?.filledTo || timeline.value?.to
})
const timelineStartMs = computed(() => parseTime(timeline.value?.from) ?? parseTime(dateRange()?.from) ?? 0)
const timelineEndMs = computed(() => {
  const fallbackEnd = parseTime(dateRange()?.to) ?? timelineStartMs.value + DAY_MS

  return parseTime(timeline.value?.to) ?? fallbackEnd
})
const fullTimelineTotalMs = computed(() => Math.max(timelineEndMs.value - timelineStartMs.value, 1))
const viewportWidthPercent = computed(() => viewportEndPercent.value - viewportStartPercent.value)
const viewportStartMs = computed(
  () => timelineStartMs.value + (fullTimelineTotalMs.value * viewportStartPercent.value) / 100
)
const viewportEndMs = computed(() => timelineStartMs.value + (fullTimelineTotalMs.value * viewportEndPercent.value) / 100)
const viewportDurationMs = computed(() => Math.max(viewportEndMs.value - viewportStartMs.value, 1))
const viewportLabel = computed(
  () => `${formatViewportTime(viewportStartMs.value)} - ${formatViewportTime(viewportEndMs.value)}`
)
const orderedDates = computed(() => orderedDateValues())
const isMultiDayRange = computed(() => orderedDates.value !== null && orderedDates.value.from !== orderedDates.value.to)
const displayRange = computed(() => {
  const range = orderedDates.value

  if (!range) return '-'

  const fromText = formatInputDate(range.from)
  const toText = formatInputDate(range.to)

  return range.from === range.to ? fromText : `${fromText} - ${toText}`
})
const axisTicks = computed(() => buildAxisTicks())
const displaySegments = computed(() =>
  buildDisplaySegments()
    .map((segment) => withRangePercent(segment, viewportStartMs.value, viewportEndMs.value))
    .filter(Boolean)
)
const selectedTimelineMarker = computed(() => {
  if (selectedTimelineMs.value === null) {
    return null
  }

  if (selectedTimelineMs.value < viewportStartMs.value || selectedTimelineMs.value > viewportEndMs.value) {
    return null
  }

  return {
    leftPercent: ((selectedTimelineMs.value - viewportStartMs.value) / viewportDurationMs.value) * 100,
    title: formatDateTime(selectedTimelineMs.value)
  }
})
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

  for (const segment of buildDisplaySegments()) {
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

// Đổi máy/khoảng ngày thì tải lại timeline.
async function handleTimelineFilterChange() {
  eventPage.value = 1
  normalizeDateRangeInputs()
  resetViewport()
  await loadTimeline()
}

// Đổi khu vực thì tải lại danh sách máy.
async function handleLocationFilterChange() {
  eventPage.value = 1
  resetViewport()
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

// Ngày hiện tại cho input ngày dạng người dùng nhập tay.
function todayInputValue() {
  return formatDateForInput(new Date())
}

function parseDateInput(value) {
  const text = String(value || '').trim()

  if (!text) {
    return null
  }

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  const localMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  const match = isoMatch || localMatch

  if (!match) {
    return null
  }

  const year = Number(isoMatch ? match[1] : match[3])
  const month = Number(match[2])
  const day = Number(isoMatch ? match[3] : match[1])
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function formatDateForInput(date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('/')
}

function formatDateForApi(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

function isValidDateInput(value) {
  return Boolean(parseDateInput(value))
}

function orderedDateValues(fromValue = fromDate.value, toValue = toDate.value) {
  const from = parseDateInput(fromValue)
  const to = parseDateInput(toValue)

  if (!from || !to) {
    return null
  }

  return from.getTime() <= to.getTime()
    ? { from: formatDateForApi(from), to: formatDateForApi(to) }
    : { from: formatDateForApi(to), to: formatDateForApi(from) }
}

function normalizeDateInput(key) {
  const target = key === 'fromDate' ? fromDate : toDate
  const date = parseDateInput(target.value)

  if (date) {
    target.value = formatDateForInput(date)
  }
}

function normalizeDateRangeInputs() {
  if (!fromDate.value && toDate.value) {
    fromDate.value = toDate.value
  }

  if (!toDate.value && fromDate.value) {
    toDate.value = fromDate.value
  }

  const range = orderedDateValues()

  if (!range) {
    return
  }

  fromDate.value = formatDateForInput(parseDateInput(range.from))
  toDate.value = formatDateForInput(parseDateInput(range.to))
}

function setDatePickerRef(key, element) {
  if (element) {
    datePickerRefs[key] = element
  } else {
    delete datePickerRefs[key]
  }
}

function datePickerValue(value) {
  const date = parseDateInput(value)
  return date ? formatDateForApi(date) : ''
}

async function selectDateFromPicker(key, value) {
  const date = parseDateInput(value)

  if (key === 'fromDate') {
    fromDate.value = date ? formatDateForInput(date) : ''
  } else {
    toDate.value = date ? formatDateForInput(date) : ''
  }

  await handleTimelineFilterChange()
}

function openDatePicker(key) {
  const picker = datePickerRefs[key]

  if (!picker) {
    return
  }

  picker.value = datePickerValue(key === 'fromDate' ? fromDate.value : toDate.value)

  if (typeof picker.showPicker === 'function') {
    picker.showPicker()
    return
  }

  picker.focus()
  picker.click()
}

// Tạo khoảng từ 00:00 ngày bắt đầu đến 24:00 ngày kết thúc.
function dateRange(fromValue = fromDate.value, toValue = toDate.value) {
  const range = orderedDateValues(fromValue, toValue)

  if (!range) {
    return null
  }

  const from = new Date(`${range.from}T00:00:00`)
  const to = new Date(`${range.to}T00:00:00`)
  to.setDate(to.getDate() + 1)

  return {
    from: from.toISOString(),
    to: to.toISOString()
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function minViewportPercent() {
  return clamp((VIEWPORT_MIN_MS / fullTimelineTotalMs.value) * 100, 0.1, 100)
}

function viewportCenterPercent() {
  return (viewportStartPercent.value + viewportEndPercent.value) / 2
}

// Set khung nhìn (0-100%), tự kẹp trong [0,100] và đảm bảo độ rộng tối thiểu
// (không cho zoom quá sâu tới mức khung nhìn nhỏ hơn VIEWPORT_MIN_MS).
function setViewportPercent(startPercent, endPercent) {
  const minimum = minViewportPercent()
  let start = clamp(startPercent, 0, 100)
  let end = clamp(endPercent, 0, 100)

  if (end - start < minimum) {
    const center = clamp((start + end) / 2, minimum / 2, 100 - minimum / 2)
    start = center - minimum / 2
    end = center + minimum / 2
  }

  if (start < 0) {
    end -= start
    start = 0
  }

  if (end > 100) {
    start -= end - 100
    end = 100
  }

  viewportStartPercent.value = clamp(start, 0, 100 - minimum)
  viewportEndPercent.value = clamp(end, viewportStartPercent.value + minimum, 100)
}

function setViewportAround(centerPercent, widthPercent) {
  const width = clamp(widthPercent, minViewportPercent(), 100)
  const center = clamp(centerPercent, width / 2, 100 - width / 2)

  setViewportPercent(center - width / 2, center + width / 2)
}

function resetViewport() {
  viewportStartPercent.value = 0
  viewportEndPercent.value = 100
  selectedTimelineMs.value = null
}

function zoomViewport(factor, anchorPercent = viewportCenterPercent()) {
  setViewportAround(anchorPercent, viewportWidthPercent.value * factor)
}

// Tâm zoom: ưu tiên mốc đã ctrl+click, nếu chưa có thì dùng tâm viewport hiện tại.
function zoomAnchorPercent() {
  if (selectedTimelineMs.value === null) {
    return viewportCenterPercent()
  }

  return ((selectedTimelineMs.value - timelineStartMs.value) / fullTimelineTotalMs.value) * 100
}

function zoomIn() {
  zoomViewport(0.65, zoomAnchorPercent())
}

function zoomOut() {
  zoomViewport(1.45, zoomAnchorPercent())
}

function percentFromPointer(event, element) {
  const rect = element.getBoundingClientRect()

  if (!rect.width) {
    return 0
  }

  return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
}

function timestampFromTrackPointer(event) {
  const pointerPercent = percentFromPointer(event, event.currentTarget)

  return viewportStartMs.value + (viewportDurationMs.value * pointerPercent) / 100
}

// Ctrl+click vào 1 điểm: đánh dấu mốc đó và zoom khung nhìn còn 50%, canh giữa mốc.
function zoomIntoTimelinePoint(timestamp) {
  const targetWidthMs = clamp(viewportDurationMs.value * 0.5, VIEWPORT_MIN_MS, fullTimelineTotalMs.value)
  const targetWidthPercent = (targetWidthMs / fullTimelineTotalMs.value) * 100
  const centerPercent = ((timestamp - timelineStartMs.value) / fullTimelineTotalMs.value) * 100

  selectedTimelineMs.value = clamp(timestamp, timelineStartMs.value, timelineEndMs.value)
  setViewportAround(centerPercent, targetWidthPercent)
}

function startTimelinePan(event) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()

  if (event.ctrlKey) {
    zoomIntoTimelinePoint(timestampFromTrackPointer(event))
    return
  }

  dragState = {
    startX: event.clientX,
    rectWidth: event.currentTarget.getBoundingClientRect().width || 1,
    startPercent: viewportStartPercent.value,
    endPercent: viewportEndPercent.value
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopPointerDrag, { once: true })
}

// Kéo chuột để pan (trượt ngang) khung nhìn timeline.
function handlePointerMove(event) {
  if (!dragState) {
    return
  }

  const deltaPercent = ((event.clientX - dragState.startX) / dragState.rectWidth) * 100
  const windowPercent = dragState.endPercent - dragState.startPercent
  const panDelta = -(deltaPercent * windowPercent) / 100

  setViewportPercent(dragState.startPercent + panDelta, dragState.endPercent + panDelta)
}

function stopPointerDrag() {
  window.removeEventListener('pointermove', handlePointerMove)
  dragState = null
}

function handleTimelineWheel(event) {
  const factor = event.deltaY < 0 ? 0.78 : 1.28

  zoomViewport(factor, zoomAnchorPercent())
}

function parseTime(value) {
  if (!value) {
    return null
  }

  const time = new Date(value).getTime()

  return Number.isNaN(time) ? null : time
}

// Điểm cuối để vẽ segment "đang diễn ra": không vượt quá thời điểm hiện tại
// (nếu khoảng ngày chọn kéo tới hôm nay) và không vượt quá rangeEnd đã chọn.
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

// Trạng thái gần nhất tính đến endTime, dùng để suy ra máy đang ở trạng thái
// nào sau segment cuối cùng backend trả về (chưa có log mới nhưng vẫn đang chạy).
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

// Nối thêm 1 segment "đang diễn ra" từ cuối segment thật tới displayEndTime(),
// để timeline không dừng đột ngột dù chưa có log mới xác nhận (tránh kéo dài
// sang tương lai khi chưa có dữ liệu thật, chỉ vẽ tới hiện tại/rangeEnd).
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

function tickIntervalMs() {
  const duration = viewportDurationMs.value

  if (duration <= 15 * MINUTE_MS) return MINUTE_MS
  if (duration <= HOUR_MS) return 5 * MINUTE_MS
  if (duration <= 3 * HOUR_MS) return 15 * MINUTE_MS
  if (duration <= 8 * HOUR_MS) return HOUR_MS
  if (duration <= 16 * HOUR_MS) return 2 * HOUR_MS
  if (duration <= 36 * HOUR_MS) return 6 * HOUR_MS
  if (duration <= 3 * DAY_MS) return 12 * HOUR_MS
  if (duration <= 10 * DAY_MS) return DAY_MS
  if (duration <= 31 * DAY_MS) return 2 * DAY_MS

  return 7 * DAY_MS
}

function localStartOfDayMs(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)

  return date.getTime()
}

function nextTickAfter(start, interval) {
  const tolerance = MINUTE_MS / 2

  if (interval >= DAY_MS) {
    const stepDays = Math.max(Math.round(interval / DAY_MS), 1)
    let tick = localStartOfDayMs(start)

    while (tick <= start + tolerance) {
      const next = new Date(tick)
      next.setDate(next.getDate() + stepDays)
      tick = next.getTime()
    }

    return tick
  }

  const dayStart = localStartOfDayMs(start)
  let tick = dayStart

  while (tick <= start + tolerance) {
    tick += interval
  }

  return tick
}

function addTickInterval(time, interval) {
  if (interval >= DAY_MS) {
    const stepDays = Math.max(Math.round(interval / DAY_MS), 1)
    const next = new Date(time)
    next.setDate(next.getDate() + stepDays)

    return next.getTime()
  }

  return time + interval
}

// Chỉ hiện ngày khi sang ngày mới, còn lại chỉ hiện giờ cho gọn.
function buildAxisTicks() {
  const start = viewportStartMs.value
  const end = viewportEndMs.value
  const interval = tickIntervalMs()
  let lastDateKey = null

  function tickLabel(time) {
    const dateKey = localDateKey(time)
    const showDate = isMultiDayRange.value && dateKey !== lastDateKey
    lastDateKey = dateKey

    return formatAxisTime(time, showDate)
  }

  const ticks = [
    {
      key: `start-${Math.round(start)}`,
      label: tickLabel(start),
      leftPercent: 0
    }
  ]
  let nextTick = nextTickAfter(start, interval)

  while (nextTick < end - MINUTE_MS / 2 && ticks.length < 12) {
    ticks.push({
      key: `tick-${nextTick}`,
      label: tickLabel(nextTick),
      leftPercent: ((nextTick - start) / Math.max(end - start, 1)) * 100
    })
    nextTick = addTickInterval(nextTick, interval)
  }

  ticks.push({
    key: `end-${Math.round(end)}`,
    label: tickLabel(end),
    leftPercent: 100
  })

  return ticks
}

// Tính vị trí và độ rộng segment trong một khoảng thời gian.
function withRangePercent(item, rangeStart, rangeEnd, minimumWidthPercent = 0.25) {
  const total = Math.max(rangeEnd - rangeStart, 1)
  const rawStart = new Date(item.from || item.createdAt).getTime()
  const rawEnd = item.to ? new Date(item.to).getTime() : rawStart
  const start = Number.isNaN(rawStart) ? rangeStart : rawStart
  const end = Number.isNaN(rawEnd) ? start : rawEnd

  if (end <= rangeStart || start >= rangeEnd) {
    return null
  }

  const itemStart = clamp(start, rangeStart, rangeEnd)
  const itemEnd = clamp(end, itemStart, rangeEnd)
  const widthPercent = item.to ? Math.max(((itemEnd - itemStart) / total) * 100, minimumWidthPercent) : 0

  return {
    ...item,
    leftPercent: ((itemStart - rangeStart) / total) * 100,
    widthPercent,
    textColor: readableTextColor(item.color)
  }
}

function formatInputDate(value) {
  return formatDateFromInput(value)
}

function formatShortDateTime(value) {
  return formatDateHourMinute(value)
}

function formatTimelineEndpoint(value) {
  return isMultiDayRange.value ? formatShortDateTime(value) : formatTime(value)
}

function formatViewportTime(value) {
  return isMultiDayRange.value ? formatShortDateTime(value) : formatAxisTime(value)
}

function formatMarkerDate(value) {
  return formatDateOnly(value)
}

// Format giờ/phút.
function formatTime(value) {
  return formatHourMinute(value)
}

// Khoá ngày (không tính giờ) để phát hiện lúc trục sang ngày mới.
function localDateKey(value) {
  const date = new Date(value)

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// Ngày rút gọn không kèm năm, dùng cho nhãn trục thời gian.
function shortDateLabel(value) {
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function formatAxisTime(value, withDate = isMultiDayRange.value) {
  if (!value && value !== 0) return '-'
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  if (!isMultiDayRange.value && Math.abs(date.getTime() - timelineEndMs.value) < 1000) {
    return '24:00'
  }

  const timeText = formatHourMinute(date)

  if (withDate) {
    return `${shortDateLabel(date)} ${timeText}`
  }

  return timeText
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
  return `${segment.status_name}: ${formatTimelineEndpoint(segment.from)} - ${formatTimelineEndpoint(segment.to)} (${formatDuration(segment.durationMs)})`
}

// Kiểm tra event thuộc máy đang xem.
function isSelectedMachineEvent(event) {
  const payload = event?.log || event?.data || event

  return (
    String(payload?.machineId ?? event?.machineId) === String(selectedMachineId.value) ||
    String(payload?.machineCode ?? event?.machineCode) === String(selectedMachine.value?.code)
  )
}

// Kiểm tra event thuộc khoảng thời gian đang xem.
function isSelectedRangeEvent(event) {
  const range = dateRange()

  if (!range) {
    return false
  }

  const changedAt = new Date(event?.updatedAt || event?.createdAt || event?.log?.createdAt || Date.now()).getTime()

  return changedAt >= new Date(range.from).getTime() && changedAt < new Date(range.to).getTime()
}

// Tải máy cho dropdown.
async function loadMachines() {
  const response = await getMachines({
    location_id: selectedLocationId.value,
    limit: MACHINE_DROPDOWN_LIMIT
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
  const range = dateRange()

  if (!selectedMachineId.value || !range) {
    timeline.value = null
    return
  }

  try {
    loading.value = true
    error.value = ''
    const response = await getMachineStatusTimeline(selectedMachineId.value, range)
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
  if (isSelectedMachineEvent(event) && isSelectedRangeEvent(event)) {
    await loadTimeline()
  }
}

// Reload khi có log mới.
async function handleRealtimeLog(event) {
  if (isSelectedMachineEvent(event) && isSelectedRangeEvent(event)) {
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

  stopPointerDrag()
  offMachineStatusUpdated(handleRealtimeStatus)
  offMachineLogCreated(handleRealtimeLog)
})
</script>

<style scoped>
.timeline-page {
  min-height: 100vh;
  padding: 16px;
  background: var(--app-bg);
  color: var(--text-color);
}

.page-header,
.filters,
.timeline-panel,
.event-list,
.summary-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
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
  color: var(--muted-color);
}

.filters select,
.filters input {
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--surface-bg);
  color: var(--text-color);
}

.filters {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(220px, 1fr) minmax(150px, 180px) minmax(150px, 180px);
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
  user-select: none;
}

.timeline-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-title {
  display: grid;
  gap: 3px;
}

.timeline-title > strong {
  font-size: 18px;
}

.timeline-pill,
.timeline-window {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0 10px;
  background: var(--surface-muted);
  color: var(--muted-color);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.timeline-pill i,
.timeline-window i {
  color: var(--primary-color);
  font-size: 12px;
}

.timeline-pill strong {
  color: var(--text-color);
  font-size: 13px;
}

.timeline-window {
  border-color: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
  color: var(--text-color);
}

.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  color: var(--muted-color);
  font-size: 13px;
  font-weight: 700;
}

.zoom-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.zoom-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 9px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.zoom-actions button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.timeline-scale {
  position: relative;
  height: 16px;
  color: var(--muted-color);
  font-size: 12px;
}

.timeline-scale span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}

.timeline-scale span:first-child {
  transform: translateX(0);
}

.timeline-scale span:last-child {
  transform: translateX(-100%);
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 44px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-muted);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.timeline-track:active {
  cursor: grabbing;
}

.timeline-marker {
  position: absolute;
  top: -1px;
  bottom: -1px;
  z-index: 3;
  width: 2px;
  border-radius: 999px;
  background: var(--primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
  pointer-events: none;
  transform: translateX(-50%);
}

.timeline-marker::after {
  position: absolute;
  top: 4px;
  left: 50%;
  width: 8px;
  height: 8px;
  border: 2px solid var(--surface-bg);
  border-radius: 999px;
  background: var(--primary-color);
  content: '';
  transform: translateX(-50%);
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
  color: var(--muted-color);
  font-size: 13px;
}

.pagination-controls {
  display: flex;
  gap: 8px;
}

.pagination-controls button {
  height: 30px;
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

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--border-color);
  padding: 7px 10px;
  text-align: left;
  line-height: 1.25;
}

th {
  background: var(--table-header-bg);
}

td:first-child,
td:nth-child(2) {
  white-space: nowrap;
}

td:first-child {
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
  color: var(--error-text);
}

.date-input {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
}

.date-input > input[type='text'] {
  width: 100%;
  padding-right: 38px;
}

.date-picker-button {
  position: absolute;
  right: 6px;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-color);
  cursor: pointer;
}

.date-picker-button:hover,
.date-picker-button:focus-visible {
  color: var(--primary-color);
  outline: none;
}

.native-date-picker {
  position: absolute;
  right: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 900px) {
  .page-header,
  .timeline-meta,
  .timeline-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .timeline-pill,
  .timeline-window {
    justify-content: center;
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
