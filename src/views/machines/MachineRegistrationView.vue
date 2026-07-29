<template>
  <main class="machine-page">
    <header class="page-header">
      <div>
        <h1>Đăng ký máy</h1>
        <p>Quản lý danh sách máy và khu vực.</p>
      </div>
      <button
        type="button"
        class="add-machine-button"
        title="Thêm máy"
        aria-label="Thêm máy"
        @click="openCreateModal"
      >
        <i class="fas fa-plus" aria-hidden="true"></i>
      </button>
    </header>

    <MachineFilter
      :filters="machineStore.filters"
      :locations="locations"
      @apply="applyFilters"
      @reset="resetFilters"
    />

    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="machineStore.error" class="error">{{ machineStore.error }}</p>

    <MachineTable
      :machines="machineStore.machines"
      :pagination="machineStore.pagination"
      :loading="machineStore.loading"
      @edit="openEditModal"
      @delete="deleteTarget = $event"
      @page-change="changePage"
      @sort="changeSort"
    />

    <MachineFormModal
      :show="showForm"
      :machine="editingMachine"
      :locations="locations"
      :saving="machineStore.saving"
      :error="formError"
      @close="closeForm"
      @submit="saveMachine"
    />

    <MachineDeleteDialog
      :machine="deleteTarget"
      :saving="machineStore.saving"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { getLocations } from '@/api/locations.api'
import MachineDeleteDialog from '@/components/machines/MachineDeleteDialog.vue'
import MachineFilter from '@/components/machines/MachineFilter.vue'
import MachineFormModal from '@/components/machines/MachineFormModal.vue'
import MachineTable from '@/components/machines/MachineTable.vue'
import { useMachineStore } from '@/stores/machine.store'

const machineStore = useMachineStore()
const locations = ref([])
const showForm = ref(false)
const editingMachine = ref(null)
const deleteTarget = ref(null)
const formError = ref('')
const message = ref('')
let messageTimer = null

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

// Cập nhật trạng thái máy trên danh sách khi backend phát event đổi trạng thái.
function handleRealtimeStatus(event) {
  machineStore.updateMachineStatusRealtime(event)
}

// Cập nhật log cuối và highlight máy khi backend phát event log mới.
function handleRealtimeLog(event) {
  machineStore.updateMachineLogRealtime(event)
}

// Tải dữ liệu phụ trợ cho form/filter: khu vực và trạng thái.
async function loadReferenceData() {
  const [locationResponse, statusResponse] = await Promise.all([getLocations(), getStatuses()])
  locations.value = locationResponse.data || []
  statuses.value = statusResponse.data || []
}

// Mở modal ở chế độ tạo máy mới.
function openCreateModal() {
  formError.value = ''
  editingMachine.value = null
  showForm.value = true
}

// Mở modal ở chế độ sửa máy đang chọn.
function openEditModal(machine) {
  formError.value = ''
  editingMachine.value = machine
  showForm.value = true
}

// Đóng modal form và xóa lỗi tạm thời.
function closeForm() {
  showForm.value = false
  editingMachine.value = null
  formError.value = ''
}

// Lưu máy từ modal, tự chọn create hoặc update theo trạng thái editingMachine.
async function saveMachine(payload, clientError) {
  if (clientError) {
    formError.value = clientError
    return
  }

  try {
    formError.value = ''

    if (editingMachine.value) {
      await machineStore.updateMachine(editingMachine.value._id, payload)
      showMessage('Cập nhật máy thành công.')
    } else {
      await machineStore.createMachine(payload)
      showMessage('Tạo máy thành công.')
    }

    closeForm()
    await machineStore.fetchStatusCount()
  } catch (error) {
    formError.value = error.message
  }
}

// Xác nhận xóa máy và refresh thống kê trạng thái.
async function confirmDelete(machine) {
  await machineStore.deleteMachine(machine._id)
  deleteTarget.value = null
  showMessage('Đã xóa máy.')
  await machineStore.fetchStatusCount()
}

// Áp dụng bộ lọc từ form filter và tải lại danh sách từ trang đầu.
async function applyFilters(filters) {
  machineStore.filters = { ...machineStore.filters, ...filters, noData: '', abnormal: '' }
  machineStore.pagination.page = 1
  await machineStore.fetchMachines()
}

// Đưa filter về mặc định và tải lại danh sách.
async function resetFilters() {
  machineStore.resetFilters()
  await machineStore.fetchMachines()
}

// Chuyển trang trong bảng máy.
async function changePage(page) {
  machineStore.pagination.page = page
  await machineStore.fetchMachines()
}

// Đổi cột sort và đảo chiều sort hiện tại.
async function changeSort(sortBy) {
  machineStore.filters.sortBy = sortBy
  machineStore.filters.sortOrder = machineStore.filters.sortOrder === 'asc' ? 'desc' : 'asc'
  await machineStore.fetchMachines()
}

onMounted(async () => {
  machineStore.filters.noData = ''
  machineStore.filters.abnormal = ''
  await Promise.all([loadReferenceData(), machineStore.fetchMachines(), machineStore.fetchStatusCount()])
  onMachineLogCreated(handleRealtimeLog)
  onMachineStatusUpdated(handleRealtimeStatus)
})

onUnmounted(() => {
  if (messageTimer) {
    clearTimeout(messageTimer)
  }

  offMachineLogCreated(handleRealtimeLog)
  offMachineStatusUpdated(handleRealtimeStatus)
})
</script>

<style scoped>
.machine-page {
  display: grid;
  align-content: start;
  gap: 18px;
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

h1 {
  margin: 0 0 6px;
  font-size: 28px;
}

p {
  margin: 0;
  color: #6b7280;
}

.page-header button {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 6px;
  padding: 0;
  background: #0f62b4;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.page-header button:hover {
  background: #0b559f;
  box-shadow: 0 8px 18px rgba(15, 98, 180, 0.22);
  transform: translateY(-1px);
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
</style>
