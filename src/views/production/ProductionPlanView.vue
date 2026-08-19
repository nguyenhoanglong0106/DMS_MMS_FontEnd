<template>
  <main class="khsx-page">
    <FilterRailLayout title="Kế hoạch sản xuất" :subtitle="summaryText" storage-key="production-khsx">
      <template #dock>
        <label class="dock-field">
          <span>Từ ngày</span>
          <input v-model="filters.startDate" type="date" />
        </label>
        <label class="dock-field">
          <span>Đến ngày</span>
          <input v-model="filters.dueDate" type="date" />
        </label>

        <button type="button" class="dock-button primary" :disabled="loading" @click="loadData">
          <i class="fas fa-search" aria-hidden="true"></i>
          <span>Tra cứu</span>
        </button>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="table-shell">
        <table>
          <colgroup>
            <col class="col-index" />
            <col class="col-job" />
            <col class="col-part" />
            <col class="col-oper" />
            <col class="col-resgroup" />
            <col class="col-resource" />
            <col class="col-start" />
            <col class="col-due" />
            <col class="col-qty" />
            <col class="col-hours" />
          </colgroup>
          <thead>
            <tr>
              <th>STT</th>
              <th>Số lệnh SX</th>
              <th>Part</th>
              <th>Công đoạn</th>
              <th>Nhóm nguồn lực</th>
              <th>Máy / Resource</th>
              <th>Bắt đầu</th>
              <th>Đến hạn</th>
              <th>Số lượng</th>
              <th>Giờ SX ước tính</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="10" class="empty">Đang tải dữ liệu...</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="10" class="empty">Không có dữ liệu trong khoảng ngày đã chọn.</td>
            </tr>
            <tr v-for="(row, index) in rows" v-else :key="row.RowIdent || index">
              <td>{{ index + 1 }}</td>
              <td class="code" :title="row.JobHead_JobNum">{{ row.JobHead_JobNum }}</td>
              <td :title="row.Part_PartDescription">{{ row.Part_PartDescription }}</td>
              <td :title="row.JobOper_OpDesc">{{ row.JobOper_OpCode }} - {{ row.JobOper_OpDesc }}</td>
              <td :title="row.ResourceGroup_Description">{{ row.ResourceGroup_Description }}</td>
              <td :title="row.Resource_Description">{{ row.Resource_Description }}</td>
              <td>{{ formatDate(row.JobOper_StartDate) }} {{ row.Calculated_StartTime }}</td>
              <td>{{ formatDate(row.JobOper_DueDate) }} {{ row.Calculated_DueTime }}</td>
              <td>{{ formatQty(row.JobOper_RunQty) }}</td>
              <td>{{ formatQty(row.JobOper_EstProdHours) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </FilterRailLayout>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { getKhsx } from '@/api/khsx.api'
import FilterRailLayout from '@/components/layout/FilterRailLayout.vue'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const filters = reactive({
  startDate: todayIso(),
  dueDate: todayIso()
})
const rows = ref([])
const loading = ref(false)
const error = ref('')

const summaryText = computed(() => {
  if (loading.value) {
    return 'Đang tải dữ liệu...'
  }

  return `${rows.value.length} dòng kế hoạch`
})

// Gọi API KHSX theo khoảng ngày đang chọn ở dock filter.
async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const response = await getKhsx({ startDate: filters.startDate, dueDate: filters.dueDate })
    rows.value = response.data || []
  } catch (err) {
    error.value = err.message
    rows.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return String(value).slice(0, 10)
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

.table-shell {
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
  scrollbar-gutter: stable;
}

table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.col-index {
  width: 60px;
}

.col-job {
  width: 150px;
}

.col-part {
  width: 260px;
}

.col-oper {
  width: 200px;
}

.col-resgroup {
  width: 180px;
}

.col-resource {
  width: 180px;
}

.col-start,
.col-due {
  width: 150px;
}

.col-qty {
  width: 110px;
}

.col-hours {
  width: 130px;
}

th,
td {
  padding: 12px;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

th {
  background: var(--table-header-bg);
  color: var(--text-color);
  font-weight: 800;
}

.code {
  color: var(--primary-color);
  font-weight: 800;
}

.empty {
  padding: 34px;
  color: var(--muted-color);
  text-align: center;
  white-space: normal;
}
</style>
