<template>
  <main class="khsx-page">
    <FilterRailLayout title="Kế hoạch sản xuất" :subtitle="summaryText" storage-key="production-khsx">
      <template #dock>
        <div class="dock-section">
          <strong>Ngày nhập liệu</strong>
          <label class="dock-field">
            <span>Từ ngày</span>
            <div class="date-input">
              <input
                v-model.trim="filters.startDate"
                type="text"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
                @blur="normalizeFilterDate('startDate')"
                @keyup.enter="loadData"
              />
              <button
                type="button"
                class="date-picker-button"
                title="Chọn ngày"
                aria-label="Chọn ngày nhập liệu từ ngày"
                @click="openDatePicker('startDate')"
              >
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
              </button>
              <input
                :ref="(el) => setDatePickerRef('startDate', el)"
                class="native-date-picker"
                type="date"
                :value="datePickerValue(filters.startDate)"
                tabindex="-1"
                aria-hidden="true"
                @change="selectFilterDate('startDate', $event.target.value)"
              />
            </div>
          </label>
          <label class="dock-field">
            <span>Đến ngày</span>
            <div class="date-input">
              <input
                v-model.trim="filters.dueDate"
                type="text"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
                @blur="normalizeFilterDate('dueDate')"
                @keyup.enter="loadData"
              />
              <button
                type="button"
                class="date-picker-button"
                title="Chọn ngày"
                aria-label="Chọn ngày nhập liệu đến ngày"
                @click="openDatePicker('dueDate')"
              >
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
              </button>
              <input
                :ref="(el) => setDatePickerRef('dueDate', el)"
                class="native-date-picker"
                type="date"
                :value="datePickerValue(filters.dueDate)"
                tabindex="-1"
                aria-hidden="true"
                @change="selectFilterDate('dueDate', $event.target.value)"
              />
            </div>
          </label>
        </div>

        <div class="dock-section">
          <strong>Ngày sản xuất</strong>
          <label class="dock-field">
            <span>Từ ngày</span>
            <div class="date-input">
              <input
                v-model.trim="filters.jobStartDateFrom"
                type="text"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
                @blur="normalizeFilterDate('jobStartDateFrom')"
                @keyup.enter="loadData"
              />
              <button
                type="button"
                class="date-picker-button"
                title="Chọn ngày"
                aria-label="Chọn ngày sản xuất từ ngày"
                @click="openDatePicker('jobStartDateFrom')"
              >
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
              </button>
              <input
                :ref="(el) => setDatePickerRef('jobStartDateFrom', el)"
                class="native-date-picker"
                type="date"
                :value="datePickerValue(filters.jobStartDateFrom)"
                tabindex="-1"
                aria-hidden="true"
                @change="selectFilterDate('jobStartDateFrom', $event.target.value)"
              />
            </div>
          </label>
          <label class="dock-field">
            <span>Đến ngày</span>
            <div class="date-input">
              <input
                v-model.trim="filters.jobStartDateTo"
                type="text"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
                @blur="normalizeFilterDate('jobStartDateTo')"
                @keyup.enter="loadData"
              />
              <button
                type="button"
                class="date-picker-button"
                title="Chọn ngày"
                aria-label="Chọn ngày sản xuất đến ngày"
                @click="openDatePicker('jobStartDateTo')"
              >
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
              </button>
              <input
                :ref="(el) => setDatePickerRef('jobStartDateTo', el)"
                class="native-date-picker"
                type="date"
                :value="datePickerValue(filters.jobStartDateTo)"
                tabindex="-1"
                aria-hidden="true"
                @change="selectFilterDate('jobStartDateTo', $event.target.value)"
              />
            </div>
          </label>
        </div>

        <button type="button" class="dock-button primary" :disabled="loading" @click="loadData">
          <i class="fas fa-search" aria-hidden="true"></i>
          <span>Tra cứu</span>
        </button>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <DataGrid
        :columns="columns"
        :rows="rows"
        :page="pagination.page"
        :limit="pagination.limit"
        :loading="loading"
        :row-key="rowKey"
        storage-key="production-plan"
        empty-text="Không có dữ liệu trong khoảng ngày đã chọn."
        @filtered-count="visibleRowCount = $event"
      />

      <footer class="pagination">
        <span>{{ paginationText }}</span>
        <div class="pagination-actions">
          <label class="page-size">
            <span>Dòng/trang</span>
            <select v-model.number="pagination.limit" :disabled="loading" @change="changePageSize">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
          </label>

          <button type="button" :disabled="!canGoPreviousPage || loading" @click="changePage(1)">
            Đầu
          </button>
          <button type="button" :disabled="!canGoPreviousPage || loading" @click="changePage(pagination.page - 1)">
            Trước
          </button>
          <button type="button" :disabled="!canGoNextPage || loading" @click="changePage(pagination.page + 1)">
            Sau
          </button>
          <button type="button" :disabled="!canGoNextPage || loading" @click="changePage(totalPages)">
            Cuối
          </button>
        </div>
      </footer>
    </FilterRailLayout>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getKhsx } from '@/api/khsx.api'
import DataGrid from '@/components/grid/DataGrid.vue'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'
import { formatDateOnly as formatDate } from '@/utils/date-format'

function todayDisplay() {
  const today = new Date()
  return formatInputDate(today)
}

const filters = reactive({
  startDate: todayDisplay(),
  dueDate: todayDisplay(),
  jobStartDateFrom: '',
  jobStartDateTo: ''
})
const rows = ref([])
const visibleRowCount = ref(0)
const loading = ref(false)
const error = ref('')
const pageSizeOptions = [20, 50, 100]
const datePickerRefs = {}
const pagination = reactive({
  page: 1,
  limit: 20
})

// Thứ tự và tên cột giữ đúng theo kết quả BAQ DMS_GetKHSX.
const columns = [
  { key: 'createAt', field: 'createdAt', label: 'Date', width: 150, format: formatDate },
  { key: 'job', field: 'JobHead_JobNum', label: 'JobNum', width: 150, cellClass: 'code' },
  { key: 'part', field: 'JobHead_PartNum', label: 'Part', width: 160 },
  { key: 'partDescription', field: 'Part_PartDescription', label: 'Description', width: 220 },
  { key: 'operation', field: 'JobOper_OpCode', label: 'Operation', width: 110 },
  { key: 'operationDescription', field: 'JobOper_OpDesc', label: 'Operation Description', width: 210 },
  { key: 'resourceGroupId', field: 'ResourceGroup_ResourceGrpID', label: 'Resource Group ID', width: 170 },
  { key: 'resourceGroupDescription', field: 'ResourceGroup_Description', label: 'Description', width: 190 },
  { key: 'resourceId', field: 'Resource_ResourceID', label: 'Resource ID', width: 140, cellClass: 'code' },
  { key: 'resourceDescription', field: 'Resource_Description', label: 'Description', width: 190 },
  { key: 'startDate', field: 'JobOper_StartDate', label: 'Start Date', width: 130, format: formatDate },
  { key: 'startTime', field: 'Calculated_StartTime', label: 'StartTime', width: 110 },
  { key: 'unitOfDueTime', field: 'Calculated_UnitOfDueTime', label: 'UnitOfDueTime', width: 140 },
  { key: 'dueDate', field: 'JobOper_DueDate', label: 'Due Date', width: 130, format: formatDate },
  { key: 'dueTime', field: 'Calculated_DueTime', label: 'DueTime', width: 110 },
  { key: 'unitOfStartTime', field: 'Calculated_UnitOfStartTime', label: 'UnitOfStartTime', width: 150 },
  { key: 'runQty', field: 'JobOper_RunQty', label: 'Run Qty', width: 130, format: formatQty },
  { key: 'estimatedHours', field: 'JobOper_EstProdHours', label: 'Est. Prod Hours', width: 150, format: formatQty }
]

const totalPages = computed(() => Math.max(Math.ceil(visibleRowCount.value / pagination.limit), 1))
const pageStartIndex = computed(() => {
  if (visibleRowCount.value === 0) {
    return 0
  }

  return (pagination.page - 1) * pagination.limit + 1
})
const pageEndIndex = computed(() => Math.min(pagination.page * pagination.limit, visibleRowCount.value))
const canGoPreviousPage = computed(() => pagination.page > 1)
const canGoNextPage = computed(() => pagination.page < totalPages.value)
const summaryText = computed(() => {
  if (loading.value) {
    return 'Đang tải dữ liệu...'
  }

  if (visibleRowCount.value !== rows.value.length) {
    return visibleRowCount.value + '/' + rows.value.length + ' dòng kế hoạch'
  }

  return `${rows.value.length} dòng kế hoạch`
})
const paginationText = computed(() => {
  if (visibleRowCount.value === 0) {
    return 'Trang 1 / 1 - 0 dòng kế hoạch'
  }

  return `Trang ${pagination.page} / ${totalPages.value} - ${pageStartIndex.value}-${pageEndIndex.value} / ${visibleRowCount.value} dòng kế hoạch`
})

function rowKey(row, index) {
  return row._id || row.RowIdent || [row.snapshotDate, row.recordKey, index].join('|')
}

// Gọi API KHSX theo khoảng ngày snapshot đang chọn ở dock filter.
async function loadData() {
  const queryDates = buildDateQuery()

  if (!queryDates) {
    return
  }

  loading.value = true
  error.value = ''
  pagination.page = 1

  try {
    const response = await getKhsx({
      snapshotStartDate: queryDates.startDate,
      snapshotEndDate: queryDates.dueDate,
      JobOper_StartDateFrom: queryDates.jobStartDateFrom,
      JobOper_StartDateTo: queryDates.jobStartDateTo
    })
    rows.value = response.data || []
  } catch (err) {
    error.value = err.message
    rows.value = []
  } finally {
    loading.value = false
  }
}


function changePage(page) {
  pagination.page = Math.min(Math.max(Number(page) || 1, 1), totalPages.value)
}

function changePageSize() {
  pagination.page = 1
}

function parseInputDate(value) {
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

function formatInputDate(date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('/')
}

function formatApiDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

function normalizeFilterDate(key) {
  if (!filters[key]) {
    return
  }

  const date = parseInputDate(filters[key])

  if (date) {
    filters[key] = formatInputDate(date)
  }
}

function setDatePickerRef(key, element) {
  if (element) {
    datePickerRefs[key] = element
  } else {
    delete datePickerRefs[key]
  }
}

function datePickerValue(value) {
  const date = parseInputDate(value)
  return date ? formatApiDate(date) : ''
}

function selectFilterDate(key, value) {
  const date = parseInputDate(value)
  filters[key] = date ? formatInputDate(date) : ''
}

function openDatePicker(key) {
  const picker = datePickerRefs[key]

  if (!picker) {
    return
  }

  picker.value = datePickerValue(filters[key])

  if (typeof picker.showPicker === 'function') {
    picker.showPicker()
    return
  }

  picker.focus()
  picker.click()
}


function buildDateQuery() {
  const result = {}
  const invalidLabels = []
  const dateFields = [
    ['startDate', 'Ngày nhập liệu từ ngày'],
    ['dueDate', 'Ngày nhập liệu đến ngày'],
    ['jobStartDateFrom', 'Ngày sản xuất từ ngày'],
    ['jobStartDateTo', 'Ngày sản xuất đến ngày']
  ]

  for (const [key, label] of dateFields) {
    const value = filters[key]

    if (!value) {
      result[key] = ''
      continue
    }

    const date = parseInputDate(value)

    if (!date) {
      invalidLabels.push(label)
      continue
    }

    filters[key] = formatInputDate(date)
    result[key] = formatApiDate(date)
  }

  if (invalidLabels.length > 0) {
    error.value = `${invalidLabels.join(', ')} không hợp lệ. Vui lòng nhập dạng dd/mm/yyyy.`
    rows.value = []
    visibleRowCount.value = 0
    pagination.page = 1
    return null
  }

  return result
}

function formatQty(value) {
  const num = Number(value)

  if (!Number.isFinite(num)) {
    return value || '-'
  }

  return num.toLocaleString('vi-VN')
}

onMounted(loadData)

watch(totalPages, (nextTotalPages) => {
  if (pagination.page > nextTotalPages) {
    pagination.page = nextTotalPages
  }
})
</script>

<style scoped>
.khsx-page {
  min-height: 100vh;
  padding: 16px;
  background: var(--app-bg);
  color: var(--text-color);
}

p {
  margin: 0;
  color: var(--muted-color);
}

.error {
  box-sizing: border-box;
  width: 100%;
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--error-bg);
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

:deep(.code) {
  color: var(--primary-color);
  font-weight: 800;
}

:deep(.data-grid-shell) {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-top: 0;
  border-radius: 0 0 8px 8px;
  padding: 12px;
  background: var(--surface-bg);
  color: var(--muted-color);
}

.pagination-actions,
.page-size {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size span {
  font-weight: 700;
}

.page-size select,
.pagination button {
  min-height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-bg);
  color: var(--text-color);
  font: inherit;
  font-weight: 700;
}

.page-size select {
  padding: 6px 28px 6px 10px;
}

.pagination button {
  min-width: 58px;
  padding: 7px 10px;
  cursor: pointer;
}

.pagination button:disabled,
.page-size select:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 720px) {
  .pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .pagination-actions {
    flex-wrap: wrap;
  }

  .page-size {
    width: 100%;
  }
}
</style>

