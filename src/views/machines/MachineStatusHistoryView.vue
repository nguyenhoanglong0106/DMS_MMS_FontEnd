<template>
  <main class="history-page">
    <section class="filters">
      <input v-model="filters.from" type="datetime-local" />
      <input v-model="filters.to" type="datetime-local" />
      <select v-model="filters.status_id">
        <option value="">Tất cả</option>
        <option v-for="status in statuses" :key="status.status_id" :value="status.status_id">
          {{ status.status_name }}
        </option>
      </select>
      <button type="button" @click="loadHistory">Lọc</button>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <table>
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Status</th>
          <th>Mô tả</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="history.length === 0">
          <td colspan="3" class="empty">Chưa có dữ liệu.</td>
        </tr>
        <tr v-for="item in history" :key="item._id">
          <td>{{ formatDate(item.createdAt) }}</td>
          <td>
            <span class="status-color">
              <span class="status-swatch" :style="{ backgroundColor: statusColor(item.status_id) }"></span>
              {{ statusName(item.status_id) }}
            </span>
          </td>
          <td>{{ item.description || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getMachineStatusHistory } from '@/api/machines.api'
import { getStatuses } from '@/api/statuses.api'
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
</script>

<style scoped>
.history-page {
  display: grid;
  gap: 18px;
  min-height: 100vh;
  padding: 28px;
  background: #f8fafc;
}

h1 {
  margin: 0;
}

a {
  color: #0f62b4;
  font-weight: 800;
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
  gap: 12px;
}

input,
select,
button {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
}

button {
  background: #0f62b4;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

table {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  border-collapse: collapse;
  background: #ffffff;
}

th,
td {
  border-bottom: 1px solid #edf2f7;
  padding: 12px;
  text-align: left;
}

.empty,
.error {
  color: #991b1b;
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
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 4px;
}
</style>
