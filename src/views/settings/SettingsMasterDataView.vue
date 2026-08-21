<template>
  <main class="settings-page">
    <header class="page-header">
      <div>
        <h1>{{ pageTitle }}</h1>
        <p>{{ pageDescription }}</p>
      </div>
      <button type="button" class="reload-button" :disabled="loading" @click="loadCurrent">
        <i class="fas fa-sync-alt" aria-hidden="true"></i>
        <span>{{ loading ? 'Đang tải...' : 'Tải lại' }}</span>
      </button>
    </header>

    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="activeTab === 'locations'" class="master-layout">
      <form class="master-form" @submit.prevent="saveLocation">
        <header>
          <h2>{{ editingLocation ? 'Sửa location' : 'Thêm location' }}</h2>
          <button v-if="editingLocation" type="button" class="icon-button secondary" title="Hủy sửa" @click="resetLocationForm">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <label>
          Mã location
          <input v-model.trim="locationForm.location_id" type="text" placeholder="1" />
        </label>
        <label>
          Tên location
          <input v-model.trim="locationForm.location_name" type="text" placeholder="CT09" />
        </label>

        <footer>
          <button type="button" class="secondary" @click="resetLocationForm">
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
          <h2>Danh sách location</h2>
          <span>{{ locations.length }} dòng</span>
        </header>

        <DataGrid
          :columns="locationColumns"
          :rows="locations"
          :loading="loading"
          row-key="_id"
          storage-key="settings-locations"
          loading-text="Đang tải dữ liệu..."
          empty-text="Chưa có location."
        >
          <template #cell-actions="{ row }">
            <div class="actions">
              <button type="button" class="action-icon edit" title="Sửa" @click="editLocation(row)">
                <i class="fas fa-edit" aria-hidden="true"></i>
              </button>
              <button type="button" class="action-icon danger" title="Xóa" @click="removeLocation(row)">
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
              </button>
            </div>
          </template>
        </DataGrid>
      </section>
    </section>

    <section v-else class="status-settings-stack">
      <section class="master-layout">
        <form class="master-form" @submit.prevent="saveStatus">
        <header>
          <h2>Trạng thái vận hành</h2>
          <button v-if="editingStatus" type="button" class="icon-button secondary" title="Hủy sửa" @click="resetStatusForm">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>
        <label>
          Tên trạng thái
          <input v-model.trim="statusForm.status_name" type="text" placeholder="Đang chạy" :disabled="!editingStatus" />
        </label>
        <label>
          Mã màu
          <span class="color-input">
            <input v-model="statusForm.color_code" type="color" :disabled="!editingStatus" />
            <input v-model.trim="statusForm.color_code" type="text" placeholder="#16A34A" :disabled="!editingStatus" />
          </span>
        </label>

        <footer>
          <button type="button" class="secondary" @click="resetStatusForm">
            <i class="fas fa-undo" aria-hidden="true"></i>
            <span>Hủy</span>
          </button>
          <button type="submit" :disabled="saving || !editingStatus">
            <i class="fas fa-save" aria-hidden="true"></i>
            <span>{{ saving ? 'Đang lưu...' : 'Lưu' }}</span>
          </button>
        </footer>
        </form>

        <section class="table-panel">
        <header>
          <h2>Danh sách trạng thái vận hành</h2>
          <span>{{ statuses.length }} dòng</span>
        </header>

        <DataGrid
          :columns="statusColumns"
          :rows="statuses"
          :loading="loading"
          :row-key="statusRowKey"
          storage-key="settings-statuses"
          loading-text="Đang tải dữ liệu..."
          empty-text="Chưa có trạng thái."
        >
          <template #cell-color="{ row }">
            <span class="status-color">
              <span :style="{ backgroundColor: displayStatusColor(row) }"></span>
              {{ displayStatusColor(row) }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <div class="actions">
              <button type="button" class="action-icon edit" title="Sửa" @click="editStatus(row)">
                <i class="fas fa-edit" aria-hidden="true"></i>
              </button>
            </div>
          </template>
        </DataGrid>
        </section>
      </section>

      <section class="master-layout">
        <form class="master-form" @submit.prevent="saveConnectionStatus">
          <header>
            <h2>Trạng thái kết nối</h2>
            <button
              v-if="editingConnectionStatus"
              type="button"
              class="icon-button secondary"
              title="Hủy sửa"
              @click="resetConnectionStatusForm"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <label>
            Tên trạng thái
            <input
              v-model.trim="connectionStatusForm.connect_desc"
              type="text"
              placeholder="Online"
              :disabled="!editingConnectionStatus"
            />
          </label>
          <label>
            Mã màu
            <span class="color-input">
              <input v-model="connectionStatusForm.color_code" type="color" :disabled="!editingConnectionStatus" />
              <input
                v-model.trim="connectionStatusForm.color_code"
                type="text"
                placeholder="#16A34A"
                :disabled="!editingConnectionStatus"
              />
            </span>
          </label>

          <footer>
            <button type="button" class="secondary" @click="resetConnectionStatusForm">
              <i class="fas fa-undo" aria-hidden="true"></i>
              <span>Hủy</span>
            </button>
            <button type="submit" :disabled="saving || !editingConnectionStatus">
              <i class="fas fa-save" aria-hidden="true"></i>
              <span>{{ saving ? 'Đang lưu...' : 'Lưu' }}</span>
            </button>
          </footer>
        </form>

        <section class="table-panel">
          <header>
            <h2>Danh sách trạng thái kết nối</h2>
            <span>{{ connectionStatuses.length }} dòng</span>
          </header>

          <DataGrid
            :columns="connectionStatusColumns"
            :rows="connectionStatuses"
            :loading="loading"
            :row-key="connectionStatusRowKey"
            storage-key="settings-connection-statuses"
            loading-text="Đang tải dữ liệu..."
            empty-text="Chưa có trạng thái kết nối."
          >
            <template #cell-color="{ row }">
              <span class="status-color">
                <span :style="{ backgroundColor: displayConnectionStatusColor(row) }"></span>
                {{ displayConnectionStatusColor(row) }}
              </span>
            </template>

            <template #cell-actions="{ row }">
              <div class="actions">
                <button type="button" class="action-icon edit" title="Sửa" @click="editConnectionStatus(row)">
                  <i class="fas fa-edit" aria-hidden="true"></i>
                </button>
              </div>
            </template>
          </DataGrid>
        </section>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation
} from '@/api/locations.api'
import {
  getStatuses,
  updateStatus
} from '@/api/statuses.api'
import {
  getMachineConnectionStatuses,
  updateMachineConnectionStatus
} from '@/api/machineConnectionStatuses.api'
import DataGrid from '@/components/grid/DataGrid.vue'
import { getStatusById } from '@/constants/machine-status'

const props = defineProps({
  section: {
    type: String,
    default: 'locations'
  }
})

const activeTab = computed(() => (props.section === 'statuses' ? 'statuses' : 'locations'))
const pageTitle = computed(() => (activeTab.value === 'statuses' ? 'Cài đặt trạng thái' : 'Cài đặt location'))
const pageDescription = computed(() => (
  activeTab.value === 'statuses'
    ? 'Chỉnh sửa tên và màu hiển thị của trạng thái vận hành và trạng thái kết nối.'
    : 'Quản lý master data khu vực máy.'
))
const locations = ref([])
const statuses = ref([])
const connectionStatuses = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const locationForm = reactive({
  _id: '',
  location_id: '',
  location_name: ''
})
const statusForm = reactive({
  _id: '',
  status_id: '',
  status_name: '',
  color_code: '#6B7280'
})
const connectionStatusForm = reactive({
  _id: '',
  connect_id: '',
  connect_desc: '',
  color_code: '#6B7280'
})
let messageTimer = null

const editingLocation = computed(() => Boolean(locationForm._id))
const editingStatus = computed(() => Boolean(statusForm._id))
const editingConnectionStatus = computed(() => Boolean(connectionStatusForm._id))
const locationColumns = [
  { key: 'index', label: 'STT', value: locationIndex, width: 72, filterable: false },
  { key: 'location_id', field: 'location_id', label: 'Mã location', width: 160, cellClass: 'code' },
  { key: 'location_name', field: 'location_name', label: 'Tên location', width: 240 },
  { key: 'actions', label: 'Thao tác', width: 120, filterable: false }
]
const statusColumns = [
  { key: 'index', label: 'STT', value: statusIndex, width: 72, filterable: false },
  { key: 'status_id', field: 'status_id', label: 'Mã trạng thái', width: 150, cellClass: 'code' },
  { key: 'status_name', field: 'status_name', label: 'Tên trạng thái', width: 220 },
  { key: 'color', label: 'Mã màu', value: displayStatusColor, width: 150 },
  { key: 'actions', label: 'Thao tác', width: 110, filterable: false }
]
const connectionStatusColumns = [
  { key: 'index', label: 'STT', value: connectionStatusIndex, width: 72, filterable: false },
  { key: 'connect_id', field: 'connect_id', label: 'Mã trạng thái', width: 150, cellClass: 'code' },
  { key: 'connect_desc', field: 'connect_desc', label: 'Tên trạng thái', width: 220 },
  { key: 'color', label: 'Mã màu', value: displayConnectionStatusColor, width: 150 },
  { key: 'actions', label: 'Thao tác', width: 110, filterable: false }
]

function locationIndex(location) {
  return locations.value.indexOf(location) + 1
}

function statusIndex(status) {
  return statuses.value.indexOf(status) + 1
}

function connectionStatusIndex(status) {
  return connectionStatuses.value.indexOf(status) + 1
}

function statusRowKey(status) {
  return status._id || status.status_id
}

function connectionStatusRowKey(status) {
  return status._id || status.connect_id
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

function setError(text) {
  error.value = text
}

async function loadLocations() {
  const response = await getLocations()
  locations.value = response.data || []
}

async function loadStatuses() {
  const response = await getStatuses()
  statuses.value = response.data || []
}

async function loadConnectionStatuses() {
  const response = await getMachineConnectionStatuses()
  connectionStatuses.value = response.data || []
}

async function loadCurrent() {
  loading.value = true
  error.value = ''

  try {
    if (activeTab.value === 'statuses') {
      await Promise.all([loadStatuses(), loadConnectionStatuses()])
    } else {
      await loadLocations()
    }
  } catch (loadError) {
    setError(loadError.message)
  } finally {
    loading.value = false
  }
}

function resetLocationForm() {
  locationForm._id = ''
  locationForm.location_id = ''
  locationForm.location_name = ''
  error.value = ''
}

function editLocation(location) {
  locationForm._id = location._id
  locationForm.location_id = location.location_id || ''
  locationForm.location_name = location.location_name || ''
  error.value = ''
}

async function saveLocation() {
  const payload = {
    location_id: locationForm.location_id.trim(),
    location_name: locationForm.location_name.trim()
  }

  if (!payload.location_id || !payload.location_name) {
    setError('Vui lòng nhập đủ mã location và tên location.')
    return
  }

  saving.value = true
  error.value = ''

  try {
    if (editingLocation.value) {
      await updateLocation(locationForm._id, payload)
      showMessage('Cập nhật location thành công.')
    } else {
      await createLocation(payload)
      showMessage('Tạo location thành công.')
    }

    resetLocationForm()
    await loadLocations()
  } catch (saveError) {
    setError(saveError.message)
  } finally {
    saving.value = false
  }
}

async function removeLocation(location) {
  if (!window.confirm(`Xóa location ${location.location_name}?`)) {
    return
  }

  saving.value = true
  error.value = ''

  try {
    await deleteLocation(location._id)
    showMessage('Đã xóa location.')
    if (locationForm._id === location._id) {
      resetLocationForm()
    }
    await loadLocations()
  } catch (deleteError) {
    setError(deleteError.message)
  } finally {
    saving.value = false
  }
}

function resetStatusForm() {
  statusForm._id = ''
  statusForm.status_id = ''
  statusForm.status_name = ''
  statusForm.color_code = '#6B7280'
  error.value = ''
}

function resetConnectionStatusForm() {
  connectionStatusForm._id = ''
  connectionStatusForm.connect_id = ''
  connectionStatusForm.connect_desc = ''
  connectionStatusForm.color_code = '#6B7280'
  error.value = ''
}

// Chuẩn hóa màu về dạng #RRGGBB viết hoa; hỗ trợ cả input dạng rút gọn #RGB.
function normalizeColorCode(value, fallback = '#6B7280') {
  const color = String(value || '').trim()

  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const [, red, green, blue] = color
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase()
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color.toUpperCase()
  }

  return fallback
}

function displayStatusColor(status) {
  return normalizeColorCode(status.color_code || status.color || getStatusById(status.status_id)?.color)
}

function displayConnectionStatusColor(status) {
  return normalizeColorCode(status.color_code || status.color)
}

function isHexColor(value) {
  return /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
}

function editStatus(status) {
  statusForm._id = status._id
  statusForm.status_id = status.status_id || ''
  statusForm.status_name = status.status_name || ''
  statusForm.color_code = displayStatusColor(status)
  error.value = ''
}

function editConnectionStatus(status) {
  connectionStatusForm._id = status._id
  connectionStatusForm.connect_id = status.connect_id || ''
  connectionStatusForm.connect_desc = status.connect_desc || ''
  connectionStatusForm.color_code = displayConnectionStatusColor(status)
  error.value = ''
}

async function saveStatus() {
  if (!editingStatus.value) {
    setError('Vui lòng chọn trạng thái cần chỉnh sửa.')
    return
  }

  const payload = {
    status_name: statusForm.status_name.trim(),
    color_code: normalizeColorCode(statusForm.color_code)
  }
  const colorCode = statusForm.color_code.trim()

  if (!payload.status_name) {
    setError('Vui lòng nhập tên trạng thái.')
    return
  }

  if (!colorCode || !isHexColor(colorCode)) {
    setError('Màu phải có dạng #RGB hoặc #RRGGBB.')
    return
  }

  saving.value = true
  error.value = ''

  try {
    await updateStatus(statusForm._id, payload)
    showMessage('Cập nhật trạng thái thành công.')

    resetStatusForm()
    await loadStatuses()
  } catch (saveError) {
    setError(saveError.message)
  } finally {
    saving.value = false
  }
}

async function saveConnectionStatus() {
  if (!editingConnectionStatus.value) {
    setError('Vui lòng chọn trạng thái kết nối cần chỉnh sửa.')
    return
  }

  const colorCode = connectionStatusForm.color_code.trim()
  const payload = {
    connect_desc: connectionStatusForm.connect_desc.trim(),
    color_code: normalizeColorCode(colorCode)
  }

  if (!payload.connect_desc) {
    setError('Vui lòng nhập tên trạng thái kết nối.')
    return
  }

  if (!colorCode || !isHexColor(colorCode)) {
    setError('Màu phải có dạng #RGB hoặc #RRGGBB.')
    return
  }

  saving.value = true
  error.value = ''

  try {
    await updateMachineConnectionStatus(connectionStatusForm._id, payload)
    showMessage('Cập nhật trạng thái kết nối thành công.')

    resetConnectionStatusForm()
    await loadConnectionStatuses()
  } catch (saveError) {
    setError(saveError.message)
  } finally {
    saving.value = false
  }
}

watch(
  () => props.section,
  () => {
    resetLocationForm()
    resetStatusForm()
    resetConnectionStatusForm()
    loadCurrent()
  }
)

onMounted(loadCurrent)
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
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.status-settings-stack {
  display: grid;
  gap: 16px;
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

input {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--surface-bg);
  color: var(--text-color);
}

input:focus {
  border-color: var(--primary-color);
  outline: 3px solid color-mix(in srgb, var(--primary-color) 16%, transparent);
}

input:disabled {
  background: var(--surface-muted);
  color: var(--muted-color);
  cursor: not-allowed;
}

.color-input {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
}

.color-input input[type='color'] {
  padding: 3px;
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
  min-width: 620px;
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

.status-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.status-color span {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--text-color) 8%, transparent);
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
