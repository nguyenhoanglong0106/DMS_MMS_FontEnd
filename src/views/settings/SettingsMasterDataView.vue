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

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã location</th>
                <th>Tên location</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="empty">Đang tải dữ liệu...</td>
              </tr>
              <tr v-else-if="locations.length === 0">
                <td colspan="4" class="empty">Chưa có location.</td>
              </tr>
              <tr v-for="(location, index) in locations" v-else :key="location._id">
                <td>{{ index + 1 }}</td>
                <td class="code">{{ location.location_id }}</td>
                <td>{{ location.location_name }}</td>
                <td class="actions">
                  <button type="button" class="action-icon edit" title="Sửa" @click="editLocation(location)">
                    <i class="fas fa-edit" aria-hidden="true"></i>
                  </button>
                  <button type="button" class="action-icon danger" title="Xóa" @click="removeLocation(location)">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <section v-else class="master-layout">
      <form class="master-form" @submit.prevent="saveStatus">
        <header>
          <h2>Chỉnh sửa trạng thái</h2>
          <button v-if="editingStatus" type="button" class="icon-button secondary" title="Hủy sửa" @click="resetStatusForm">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <p v-if="!editingStatus" class="form-hint">Chọn một trạng thái trong bảng để chỉnh sửa.</p>

        <label>
          Mã trạng thái cố định
          <input v-model.trim="statusForm.status_id" type="text" placeholder="1" disabled />
        </label>
        <label>
          Tên trạng thái
          <input v-model.trim="statusForm.status_name" type="text" placeholder="Online" :disabled="!editingStatus" />
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
          <h2>Danh sách trạng thái</h2>
          <span>{{ statuses.length }} dòng</span>
        </header>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã trạng thái</th>
                <th>Tên trạng thái</th>
                <th>Mã màu</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="empty">Đang tải dữ liệu...</td>
              </tr>
              <tr v-else-if="statuses.length === 0">
                <td colspan="5" class="empty">Chưa có trạng thái.</td>
              </tr>
              <tr v-for="(status, index) in statuses" v-else :key="status._id || status.status_id">
                <td>{{ index + 1 }}</td>
                <td class="code">{{ status.status_id }}</td>
                <td>{{ status.status_name }}</td>
                <td>
                  <span class="status-color">
                    <span :style="{ backgroundColor: displayStatusColor(status) }"></span>
                    {{ displayStatusColor(status) }}
                  </span>
                </td>
                <td class="actions">
                  <button type="button" class="action-icon edit" title="Sửa" @click="editStatus(status)">
                    <i class="fas fa-edit" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
    ? 'Chỉnh sửa tên và màu hiển thị của trạng thái máy.'
    : 'Quản lý master data khu vực máy.'
))
const locations = ref([])
const statuses = ref([])
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
let messageTimer = null

const editingLocation = computed(() => Boolean(locationForm._id))
const editingStatus = computed(() => Boolean(statusForm._id))

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

async function loadCurrent() {
  loading.value = true
  error.value = ''

  try {
    if (activeTab.value === 'statuses') {
      await loadStatuses()
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

function displayStatusColor(status) {
  return status.color_code || status.color || getStatusById(status.status_id)?.color || '#6B7280'
}

function isHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

function editStatus(status) {
  statusForm._id = status._id
  statusForm.status_id = status.status_id || ''
  statusForm.status_name = status.status_name || ''
  statusForm.color_code = displayStatusColor(status)
  error.value = ''
}

async function saveStatus() {
  if (!editingStatus.value) {
    setError('Vui lòng chọn trạng thái cần chỉnh sửa.')
    return
  }

  const payload = {
    status_name: statusForm.status_name.trim(),
    color_code: statusForm.color_code.trim()
  }

  if (!payload.status_name) {
    setError('Vui lòng nhập tên trạng thái.')
    return
  }

  if (!payload.color_code || !isHexColor(payload.color_code)) {
    setError('Màu phải có dạng #RRGGBB.')
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

watch(
  () => props.section,
  () => {
    resetLocationForm()
    resetStatusForm()
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
  background: #f8fafc;
  color: #111827;
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
  color: #6b7280;
}

button {
  border: 1px solid #0f62b4;
  border-radius: 6px;
  background: #0f62b4;
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
  background: #dcfce7;
  color: #166534;
}

.error {
  background: #fee2e2;
  color: #991b1b;
}

.form-hint {
  border-radius: 6px;
  padding: 10px 12px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.master-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.master-form,
.table-panel {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
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
  color: #374151;
  font-size: 14px;
  font-weight: 700;
}

input {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
  color: #0f172a;
}

input:focus {
  border-color: #0f62b4;
  outline: 3px solid rgba(15, 98, 180, 0.14);
}

input:disabled {
  background: #f3f4f6;
  color: #6b7280;
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
  border-color: #d1d5db;
  background: #ffffff;
  color: #374151;
}

.icon-button {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
}

.table-panel header {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.table-panel header span {
  color: #64748b;
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
  border-bottom: 1px solid #edf2f7;
  text-align: left;
}

th {
  background: #f8fafc;
  color: #374151;
  font-weight: 800;
}

.code {
  color: #0f62b4;
  font-weight: 800;
}

.empty {
  padding: 34px;
  color: #6b7280;
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
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
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
  border-color: #fde68a;
  background: #fef3c7;
  color: #a16207;
}

.action-icon.danger {
  border-color: #fecaca;
  background: #fee2e2;
  color: #dc2626;
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
