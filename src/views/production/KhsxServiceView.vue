<template>
  <main class="settings-page">
    <header class="page-header">
      <div>
        <h1>Cấu hình</h1>
        <p>Định nghĩa lịch tự động lấy dữ liệu kế hoạch sản xuất từ Epicor về DB.</p>
      </div>
      <button type="button" class="reload-button" :disabled="loading" @click="loadSchedules">
        <i class="fas fa-sync-alt" aria-hidden="true"></i>
        <span>{{ loading ? 'Đang tải...' : 'Tải lại' }}</span>
      </button>
    </header>

    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="master-layout">
      <form class="master-form" @submit.prevent="saveSchedule">
        <header>
          <h2>{{ editingSchedule ? 'Sửa lịch đồng bộ' : 'Thêm lịch đồng bộ' }}</h2>
          <button v-if="editingSchedule" type="button" class="icon-button secondary" title="Hủy sửa" @click="resetForm">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <label>
          Tên lịch
          <input v-model.trim="form.name" type="text" placeholder="Tên lịch" />
        </label>

        <label>
          Tên BAQ
          <input v-model.trim="form.baqName" type="text" placeholder="DMS_GetKHSX" />
        </label>

        <label>
          Loại lịch
          <span class="frequency-picker">
            <label class="frequency-option">
              <input type="radio" value="daily" v-model="form.frequencyType" />
              <span>Ngày</span>
            </label>
            <label class="frequency-option">
              <input type="radio" value="monthly" v-model="form.frequencyType" />
              <span>Tháng</span>
            </label>
            <label class="frequency-option">
              <input type="radio" value="yearly" v-model="form.frequencyType" />
              <span>Năm</span>
            </label>
          </span>
        </label>

        <div class="field-row">
          <label>
            Thời gian chạy
            <select v-model.number="form.runHour">
              <option v-for="hour in 24" :key="hour - 1" :value="hour - 1">{{ hour - 1 }}h</option>
            </select>
          </label>

          <label v-if="form.frequencyType === 'monthly'">
            Ngày trong tháng
            <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" />
          </label>
        </div>

        <div v-if="form.frequencyType === 'yearly'" class="field-row">
          <label>
            Tháng
            <select v-model.number="form.yearMonth">
              <option v-for="month in 12" :key="month" :value="month">Tháng {{ month }}</option>
            </select>
          </label>
          <label>
            Ngày
            <input v-model.number="form.yearDay" type="number" min="1" max="31" />
          </label>
        </div>

        <label v-if="form.frequencyType === 'daily'">
          Thứ (để trống = chạy mọi ngày)
          <span class="weekday-picker">
            <label v-for="day in WEEKDAYS" :key="day.value" class="weekday-option">
              <input type="checkbox" :value="day.value" v-model="form.daysOfWeek" />
              <span>{{ day.label }}</span>
            </label>
          </span>
        </label>

        <label class="enabled-toggle">
          <input v-model="form.enabled" type="checkbox" />
          <span>Bật lịch</span>
        </label>

        <footer>
          <button type="button" class="secondary" @click="resetForm">
            <i class="fas fa-undo" aria-hidden="true"></i>
            <span>Đặt lại</span>
          </button>
          <button type="submit" :disabled="saving">
            <i class="fas fa-save" aria-hidden="true"></i>
            <span>{{ saving ? 'Đang lưu...' : 'Lưu' }}</span>
          </button>
        </footer>
      </form>

      <section class="table-panel">
        <header>
          <h2>Danh sách lịch đồng bộ</h2>
          <span>{{ schedules.length }} lịch</span>
        </header>

        <DataGrid
          :columns="scheduleColumns"
          :rows="schedules"
          :loading="loading"
          row-key="_id"
          storage-key="khsx-service-schedules"
          loading-text="Đang tải dữ liệu..."
          empty-text="Chưa có lịch đồng bộ nào."
        >
          <template #cell-enabled="{ row }">
            <span class="badge" :class="row.enabled ? 'badge-on' : 'badge-off'">
              {{ row.enabled ? 'Đang bật' : 'Đã tắt' }}
            </span>
          </template>

          <template #cell-lastRun="{ row }">
            <span v-if="!row.lastRunAt">Chưa chạy</span>
            <span v-else class="badge" :class="row.lastRunStatus === 'error' ? 'badge-error' : 'badge-success'">
              {{ formatDateTime(row.lastRunAt) }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <div class="actions">
              <button
                type="button"
                class="action-icon run"
                title="Chạy ngay"
                :disabled="runningId === row._id"
                @click="runNow(row)"
              >
                <i class="fas fa-play" aria-hidden="true"></i>
              </button>
              <button type="button" class="action-icon edit" title="Sửa" @click="editSchedule(row)">
                <i class="fas fa-edit" aria-hidden="true"></i>
              </button>
              <button type="button" class="action-icon danger" title="Xóa" @click="removeSchedule(row)">
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
              </button>
            </div>
          </template>
        </DataGrid>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createKhsxSchedule,
  deleteKhsxSchedule,
  getKhsxSchedules,
  runKhsxScheduleNow,
  updateKhsxSchedule
} from '@/api/khsxSchedules.api'
import DataGrid from '@/components/grid/DataGrid.vue'

const WEEKDAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' }
]

function emptyForm() {
  return {
    _id: '',
    name: '',
    baqName: '',
    frequencyType: 'daily',
    daysOfWeek: [],
    dayOfMonth: 1,
    yearMonth: 1,
    yearDay: 1,
    runHour: 6,
    enabled: true
  }
}

const schedules = ref([])
const loading = ref(false)
const saving = ref(false)
const runningId = ref('')
const error = ref('')
const message = ref('')
const form = reactive(emptyForm())
let messageTimer = null

const editingSchedule = computed(() => Boolean(form._id))
const scheduleColumns = [
  { key: 'index', label: 'STT', value: scheduleIndex, width: 72, filterable: false },
  { key: 'name', field: 'name', label: 'Tên lịch', width: 180, cellClass: 'code' },
  { key: 'baqName', field: 'baqName', label: 'BAQ', width: 150 },
  { key: 'frequency', label: 'Tần suất', value: frequencyLabel, width: 240 },
  { key: 'runHour', label: 'Giờ chạy', value: (schedule) => `${schedule.runHour}h`, width: 110 },
  { key: 'enabled', label: 'Trạng thái', value: enabledLabel, width: 130 },
  { key: 'lastRun', label: 'Lần chạy gần nhất', value: lastRunLabel, width: 190 },
  { key: 'actions', label: 'Thao tác', width: 140, filterable: false }
]

function scheduleIndex(schedule) {
  return schedules.value.indexOf(schedule) + 1
}

function enabledLabel(schedule) {
  return schedule.enabled ? 'Đang bật' : 'Đã tắt'
}

function lastRunLabel(schedule) {
  return schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : 'Chưa chạy'
}

// Hiện thông báo thành công tạm thời, tự ẩn sau 2.5s.
function showMessage(text) {
  message.value = text

  if (messageTimer) {
    clearTimeout(messageTimer)
  }

  messageTimer = setTimeout(() => {
    message.value = ''
    messageTimer = null
  }, 2500)
}

async function loadSchedules() {
  loading.value = true
  error.value = ''

  try {
    const response = await getKhsxSchedules()
    schedules.value = response.data || []
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, emptyForm())
  error.value = ''
}

function editSchedule(schedule) {
  Object.assign(form, {
    _id: schedule._id,
    name: schedule.name || '',
    baqName: schedule.baqName || '',
    frequencyType: schedule.frequencyType || 'daily',
    daysOfWeek: [...(schedule.daysOfWeek || [])],
    dayOfMonth: schedule.dayOfMonth || 1,
    yearMonth: schedule.yearMonth || 1,
    yearDay: schedule.yearDay || 1,
    runHour: schedule.runHour ?? 6,
    enabled: Boolean(schedule.enabled)
  })
  error.value = ''
}

function validateForm() {
  if (!form.name.trim()) {
    return 'Vui lòng nhập tên lịch.'
  }

  if (!form.baqName.trim()) {
    return 'Vui lòng nhập tên BAQ.'
  }

  if (form.frequencyType === 'monthly' && (!form.dayOfMonth || form.dayOfMonth < 1 || form.dayOfMonth > 31)) {
    return 'Ngày trong tháng phải từ 1-31.'
  }

  if (form.frequencyType === 'yearly' && (!form.yearDay || form.yearDay < 1 || form.yearDay > 31)) {
    return 'Ngày phải từ 1-31.'
  }

  return ''
}

async function saveSchedule() {
  const validationError = validateForm()

  if (validationError) {
    error.value = validationError
    return
  }

  const payload = {
    name: form.name.trim(),
    baqName: form.baqName.trim(),
    frequencyType: form.frequencyType,
    daysOfWeek: form.daysOfWeek,
    dayOfMonth: form.dayOfMonth,
    yearMonth: form.yearMonth,
    yearDay: form.yearDay,
    runHour: form.runHour,
    enabled: form.enabled
  }

  saving.value = true
  error.value = ''

  try {
    if (editingSchedule.value) {
      await updateKhsxSchedule(form._id, payload)
      showMessage('Cập nhật lịch đồng bộ thành công.')
    } else {
      await createKhsxSchedule(payload)
      showMessage('Tạo lịch đồng bộ thành công.')
    }

    resetForm()
    await loadSchedules()
  } catch (saveError) {
    error.value = saveError.message
  } finally {
    saving.value = false
  }
}

async function removeSchedule(schedule) {
  if (!window.confirm(`Xóa lịch "${schedule.name}"?`)) {
    return
  }

  error.value = ''

  try {
    await deleteKhsxSchedule(schedule._id)
    showMessage('Đã xóa lịch đồng bộ.')

    if (form._id === schedule._id) {
      resetForm()
    }

    await loadSchedules()
  } catch (deleteError) {
    error.value = deleteError.message
  }
}

async function runNow(schedule) {
  runningId.value = schedule._id
  error.value = ''

  try {
    await runKhsxScheduleNow(schedule._id)
    showMessage(`Đã chạy đồng bộ "${schedule.name}".`)
    await loadSchedules()
  } catch (runError) {
    error.value = runError.message
  } finally {
    runningId.value = ''
  }
}

function frequencyLabel(schedule) {
  if (schedule.frequencyType === 'daily') {
    const labels = (schedule.daysOfWeek || [])
      .map((value) => WEEKDAYS.find((day) => day.value === value)?.label || '')
      .filter(Boolean)
    return labels.length === 0 ? 'Hàng ngày' : `Hàng ngày (${labels.join(', ')})`
  }

  if (schedule.frequencyType === 'monthly') {
    return `Hàng tháng (ngày ${schedule.dayOfMonth})`
  }

  return `Hàng năm (${String(schedule.yearDay).padStart(2, '0')}/${String(schedule.yearMonth).padStart(2, '0')})`
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('vi-VN')
}

onMounted(loadSchedules)
</script>

<style scoped>
.settings-page {
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 100vh;
  padding: 28px;
  background: var(--app-bg);
  color: var(--text-color);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-bottom: 6px;
  font-size: 28px;
  line-height: 1.2;
}

.page-header p {
  color: var(--muted-color);
}

button {
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  background: var(--primary-color);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.reload-button,
.master-form footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
}

.message,
.error {
  box-sizing: border-box;
  width: 100%;
  border-radius: 6px;
  padding: 10px 12px;
}

.message {
  background: var(--success-bg);
  color: var(--success-text);
}

.error {
  background: var(--error-bg);
  color: var(--error-text);
}

.master-layout {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.master-form,
.table-panel {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
}

.master-form {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.master-form header,
.master-form footer,
.table-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  font-size: 18px;
  line-height: 1.2;
}

label {
  display: grid;
  gap: 6px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 700;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--surface-bg);
  color: var(--text-color);
}

input:focus,
select:focus {
  border-color: var(--primary-color);
  outline: 3px solid color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.frequency-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.frequency-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.frequency-option input {
  width: auto;
  height: auto;
}

.weekday-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.weekday-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.weekday-option input {
  width: auto;
  height: auto;
}

.enabled-toggle {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.enabled-toggle input {
  width: auto;
  height: auto;
}

.secondary {
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--text-color);
}

.icon-button {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
}

.table-panel header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-bg);
}

.table-panel header span {
  color: var(--muted-color);
  font-size: 13px;
  font-weight: 700;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
}

th {
  background: var(--table-header-bg);
  color: var(--text-color);
  font-weight: 800;
}

:deep(.code),
.code {
  color: var(--primary-color);
  font-weight: 800;
}

.empty {
  padding: 34px;
  color: var(--muted-color);
  text-align: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
}

.badge-on,
.badge-success {
  background: var(--success-bg);
  color: var(--success-text);
}

.badge-off {
  background: var(--surface-muted);
  color: var(--muted-color);
}

.badge-error {
  background: var(--error-bg);
  color: var(--error-text);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.action-icon:hover {
  transform: translateY(-1px);
}

.action-icon.run {
  border-color: color-mix(in srgb, var(--primary-color) 36%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 12%, var(--surface-bg));
  color: var(--primary-color);
}

.action-icon.edit {
  border-color: color-mix(in srgb, #d97706 36%, var(--border-color));
  background: color-mix(in srgb, #d97706 12%, var(--surface-bg));
  color: #d97706;
}

.action-icon.danger {
  border-color: color-mix(in srgb, var(--error-text) 36%, var(--border-color));
  background: var(--error-bg);
  color: var(--error-text);
}

@media (max-width: 900px) {
  .settings-page {
    padding: 18px;
  }

  .page-header,
  .master-layout {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
