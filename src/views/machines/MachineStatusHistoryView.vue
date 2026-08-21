<template>
  <main class="history-page">
    <FilterRailLayout title="Lịch sử trạng thái" subtitle="Lọc theo thời gian và trạng thái" storage-key="machine-status-history">
      <template #dock>
        <label class="dock-field">
          <span>Từ thời gian</span>
          <input v-model="filters.from" type="datetime-local" />
        </label>
        <label class="dock-field">
          <span>Đến thời gian</span>
          <input v-model="filters.to" type="datetime-local" />
        </label>
        <label class="dock-field">
          <span>Trạng thái</span>
          <select v-model="filters.status_id">
            <option value="">Tất cả</option>
            <option v-for="status in statuses" :key="status.status_id" :value="status.status_id">
              {{ status.status_name }}
            </option>
          </select>
        </label>
        <button type="button" class="dock-button primary" @click="loadHistory">
          <i class="fas fa-filter" aria-hidden="true"></i>
          <span>Lọc dữ liệu</span>
        </button>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <DataGrid
        :columns="historyColumns"
        :rows="history"
        row-key="_id"
        storage-key="machine-status-history"
        empty-text="Chưa có dữ liệu."
      >
        <template #cell-status="{ row }">
          <span class="status-color">
            <span class="status-swatch" :style="{ backgroundColor: statusColor(row.status_id) }"></span>
            {{ statusName(row.status_id) }}
          </span>
        </template>
      </DataGrid>
    </FilterRailLayout>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMachineStatusHistory } from '@/api/machines.api'
import { getStatuses } from '@/api/statuses.api'
import DataGrid from '@/components/grid/DataGrid.vue'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'
import { NO_DATA_STATUS, isNoDataStatusId } from '@/constants/machine-status'
import { formatDateTime as formatDate } from '@/utils/date-format'

const route = useRoute()
const history = ref([])
const statuses = ref([])
const error = ref('')
const filters = reactive({
  from: '',
  to: '',
  status_id: ''
})
const historyColumns = [
  { key: 'createdAt', field: 'createdAt', label: 'Thời gian', width: 180, format: formatDate },
  { key: 'status', label: 'Status', value: (item) => statusName(item.status_id), width: 180 },
  { key: 'description', label: 'Mô tả', value: (item) => item.description || '-', width: 320 }
]

// Tải lịch sử đổi trạng thái theo filter thời gian/trạng thái.
async function loadHistory() {
  try {
    error.value = ''
    const response = await getMachineStatusHistory(route.params.id, {
      ...filters,
      limit: 100
    })
    history.value = response.data || []
  } catch (err) {
    error.value = err.message
  }
}

// Tra cứu master data trạng thái theo status_id để lấy tên/màu hiển thị.
function statusMeta(statusId) {
  return statuses.value.find((status) => String(status.status_id) === String(statusId)) || null
}

function statusName(statusId) {
  if (isNoDataStatusId(statusId)) return NO_DATA_STATUS.name

  return statusMeta(statusId)?.status_name || statusId || '-'
}

function statusColor(statusId) {
  const meta = statusMeta(statusId)

  return meta?.color_code || meta?.color || NO_DATA_STATUS.color
}

async function loadStatuses() {
  const response = await getStatuses()
  statuses.value = response.data || []
}

onMounted(async () => {
  try {
    await Promise.all([loadStatuses(), loadHistory()])
  } catch (err) {
    error.value = err.message
  }
})

watch(
  () => route.params.id,
  async (nextId, previousId) => {
    if (
      route.name !== 'Machine Status History' ||
      !nextId ||
      String(nextId) === String(previousId)
    ) {
      return
    }

    await loadHistory()
  }
)
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  padding: 16px;
  background: var(--app-bg);
  color: var(--text-color);
}

h1 {
  margin: 0;
}

a {
  color: var(--primary-color);
  font-weight: 800;
}

table {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  border-collapse: collapse;
  background: var(--surface-bg);
}

th,
td {
  border-bottom: 1px solid var(--border-color);
  padding: 12px;
  text-align: left;
}

th {
  background: var(--table-header-bg);
}

.empty,
.error {
  color: var(--error-text);
}

.status-color {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.status-swatch {
  width: 14px;
  height: 14px;
  border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
  border-radius: 4px;
}
</style>
