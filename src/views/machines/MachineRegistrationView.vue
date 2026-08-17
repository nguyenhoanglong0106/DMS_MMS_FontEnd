<template>
  <main class="machine-page">
    <FilterRailLayout title="Đăng ký máy" :subtitle="registrationSummaryText" storage-key="machine-registration">
      <template #dock>
        <button type="button" class="dock-button primary" @click="openCreateModal">
          <i class="fas fa-plus" aria-hidden="true"></i>
          <span>Thêm máy</span>
        </button>

        <MachineFilter
          variant="dock"
          :filters="machineStore.filters"
          :locations="locations"
          @apply="applyFilters"
          @reset="resetFilters"
        />
      </template>

      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="machineStore.error" class="error">{{ machineStore.error }}</p>

      <MachineTable
        :machines="machineStore.machines"
        :pagination="machineStore.pagination"
        :loading="machineStore.loading"
        :connection-statuses="connectionStatuses"
        @edit="openEditModal"
        @delete="deleteTarget = $event"
        @page-change="changePage"
        @sort="changeSort"
      />
    </FilterRailLayout>

    <MachineFormModal
      :show="showForm"
      :machine="editingMachine"
      :machines="machinesForValidation"
      :machines-loading="validationLoading"
      :locations="locations"
      :saving="machineStore.saving"
      :error="formError"
      @close="closeForm"
      @clear-error="formError = ''"
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getLocations } from '@/api/locations.api'
import { getMachineConnectionStatuses } from '@/api/machineConnectionStatuses.api'
import { getMachines } from '@/api/machines.api'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'
import MachineDeleteDialog from '@/components/machines/MachineDeleteDialog.vue'
import MachineFilter from '@/components/machines/MachineFilter.vue'
import MachineFormModal from '@/components/machines/MachineFormModal.vue'
import MachineTable from '@/components/machines/MachineTable.vue'
import {
  offMachineConnectionUpdated,
  onMachineConnectionUpdated
} from '@/services/socket.service'
import { useMachineStore } from '@/stores/machine.store'

const machineStore = useMachineStore()
const locations = ref([])
const connectionStatuses = ref([])
const machinesForValidation = ref([])
const validationLoading = ref(false)
const showForm = ref(false)
const editingMachine = ref(null)
const deleteTarget = ref(null)
const formError = ref('')
const message = ref('')
let messageTimer = null
let validationLoaded = false
let validationRequest = null
const VALIDATION_PAGE_SIZE = 100

const registrationSummaryText = computed(() => {
  if (machineStore.loading) {
    return 'Đang tải danh sách máy...'
  }

  const total = Number(machineStore.pagination.total) || machineStore.machines.length

  return `${total} máy đang quản lý`
})

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

// Tải dữ liệu phụ trợ cho form/filter.
async function loadReferenceData() {
  const [locationResponse, connectionStatusResponse] = await Promise.all([
    getLocations(),
    getMachineConnectionStatuses()
  ])

  locations.value = locationResponse.data || []
  connectionStatuses.value = connectionStatusResponse.data || []
}

// Tải danh sách máy riêng cho validate Signal Keys, không làm ảnh hưởng phân trang bảng.
async function loadMachinesForValidation() {
  if (validationRequest) {
    return validationRequest
  }

  validationLoading.value = true
  validationRequest = (async () => {
    const machines = []
    let page = 1
    let totalPages = 1

    do {
      const response = await getMachines({
        page,
        limit: VALIDATION_PAGE_SIZE,
        sortBy: 'code',
        sortOrder: 'asc'
      })

      machines.push(...(response.data || []))
      totalPages = Number(response.pagination?.totalPages) || 1
      page += 1
    } while (page <= totalPages)

    machinesForValidation.value = machines
    validationLoaded = true
  })()

  try {
    await validationRequest
  } finally {
    validationRequest = null
    validationLoading.value = false
  }
}

async function ensureMachinesForValidation() {
  if (validationLoaded) {
    return
  }

  await loadMachinesForValidation()
}

async function refreshMachinesForValidation() {
  validationLoaded = false
  await loadMachinesForValidation()
}

// Mở modal ở chế độ tạo máy mới.
function openCreateModal() {
  formError.value = ''
  editingMachine.value = null
  showForm.value = true
  ensureMachinesForValidation().catch((error) => {
    formError.value = error.message
  })
}

// Mở modal ở chế độ sửa máy đang chọn.
function openEditModal(machine) {
  formError.value = ''
  editingMachine.value = machine
  showForm.value = true
  ensureMachinesForValidation().catch((error) => {
    formError.value = error.message
  })
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
    await refreshMachinesForValidation()
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
  await refreshMachinesForValidation()
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

function handleMachineConnectionUpdated(event) {
  machineStore.applyMachineConnectionUpdate(event)
}

onMounted(async () => {
  machineStore.filters.noData = ''
  machineStore.filters.abnormal = ''
  onMachineConnectionUpdated(handleMachineConnectionUpdated)
  await Promise.all([
    loadReferenceData(),
    machineStore.fetchMachines(),
    machineStore.fetchStatusCount()
  ])
})

onUnmounted(() => {
  offMachineConnectionUpdated(handleMachineConnectionUpdated)

  if (messageTimer) {
    clearTimeout(messageTimer)
  }
})
</script>

<style scoped>
.machine-page {
  min-height: 100vh;
  padding: 16px;
  background: var(--app-bg);
  color: var(--text-color);
}

p {
  margin: 0;
  color: var(--muted-color);
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
</style>
