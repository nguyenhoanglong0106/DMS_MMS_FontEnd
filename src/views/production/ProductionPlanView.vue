<template>
  <main class="khsx-page">
    <FilterRailLayout title="Kế hoạch sản xuất" :subtitle="summaryText" storage-key="production-khsx">
      <template #dock>
        <div class="dock-section">
          <strong>Ngày nhập liệu</strong>
          <label class="dock-field">
            <span>Từ ngày</span>
            <input v-model="filters.startDate" type="date" />
          </label>
          <label class="dock-field">
            <span>Đến ngày</span>
            <input v-model="filters.dueDate" type="date" />
          </label>
        </div>

        <div class="dock-section">
          <strong>Ngày sản xuất</strong>
          <label class="dock-field">
            <span>Từ ngày</span>
            <input v-model="filters.jobStartDateFrom" type="date" />
          </label>
          <label class="dock-field">
            <span>Đến ngày</span>
            <input v-model="filters.jobStartDateTo" type="date" />
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
        :loading="loading"
        :row-key="rowKey"
        storage-key="production-plan"
        empty-text="Không có dữ liệu trong khoảng ngày đã chọn."
        @filtered-count="visibleRowCount = $event"
      />
    </FilterRailLayout>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getKhsx } from '@/api/khsx.api'
import DataGrid from '@/components/grid/DataGrid.vue'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'
import { formatDateOnly as formatDate } from '@/utils/date-format'

function todayIso() {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-')
}

const filters = reactive({
  startDate: todayIso(),
  dueDate: todayIso(),
  jobStartDateFrom: '',
  jobStartDateTo: ''
})
const rows = ref([])
const visibleRowCount = ref(0)
const loading = ref(false)
const error = ref('')

// Thứ tự và tên cột giữ đúng theo kết quả BAQ DMS_GetKHSX.
const columns = [
  { key: 'createAt', field: 'createdAt', label: 'Date', width: 150, format: formatDate},
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

const summaryText = computed(() => {
  if (loading.value) {
    return 'Đang tải dữ liệu...'
  }

  if (visibleRowCount.value !== rows.value.length) {
    return visibleRowCount.value + '/' + rows.value.length + ' dòng kế hoạch'
  }

  return `${rows.value.length} dòng kế hoạch`
})

function rowKey(row, index) {
  return row._id || row.RowIdent || [row.snapshotDate, row.recordKey, index].join('|')
}

// Gọi API KHSX theo khoảng ngày snapshot đang chọn ở dock filter.
async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const response = await getKhsx({
      snapshotStartDate: filters.startDate,
      snapshotEndDate: filters.dueDate,
      jobStartDateFrom: filters.jobStartDateFrom,
      jobStartDateTo: filters.jobStartDateTo
    })
    rows.value = response.data || []
  } catch (err) {
    error.value = err.message
    rows.value = []
  } finally {
    loading.value = false
  }
}

function formatQty(value) {
  const num = Number(value)

  if (!Number.isFinite(num)) {
    return value || '-'
  }

  return num.toLocaleString('vi-VN')
}

onMounted(loadData)
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

:deep(.code) {
  color: var(--primary-color);
  font-weight: 800;
}
</style>
