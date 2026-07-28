<template>
  <div class="table-shell">
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th @click="$emit('sort', 'code')">Mã máy</th>
          <th @click="$emit('sort', 'name')">Tên máy</th>
          <th>Khu vực</th>
          <th>Signal Keys</th>
          <th>Trạng thái</th>
          <th>Tín hiệu cuối</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="8" class="empty">Đang tải dữ liệu...</td>
        </tr>
        <tr v-else-if="machines.length === 0">
          <td colspan="8" class="empty">Chưa có máy phù hợp.</td>
        </tr>
        <tr v-for="(machine, index) in machines" v-else :key="machine._id">
          <td>{{ rowIndex(index) }}</td>
          <td class="code">{{ machine.code }}</td>
          <td>{{ machine.name }}</td>
          <td>{{ machine.location?.location_name || '-' }}</td>
          <td>{{ machine.signalKeys }}</td>
          <td>
            <MachineStatusBadge
              :status-id="machine.currentStatus?.status_id"
              :status-name="machine.currentStatus?.status_name"
              :status-color="machine.currentStatus?.color"
              size="sm"
            />
          </td>
          <td>{{ formatDate(machine.lastSignalAt || machine.lastLog?.createdAt || machine.latestLog?.createdAt) }}</td>
          <td class="actions">
            <RouterLink
              :to="`/machines/${machine._id}`"
              class="action-icon view"
              title="Chi tiết"
              aria-label="Chi tiết"
            >
              <i class="fas fa-eye" aria-hidden="true"></i>
            </RouterLink>
            <button
              type="button"
              class="action-icon edit"
              title="Sửa"
              aria-label="Sửa"
              @click="$emit('edit', machine)"
            >
              <i class="fas fa-edit" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="action-icon danger"
              title="Xóa"
              aria-label="Xóa"
              @click="$emit('delete', machine)"
            >
              <i class="fas fa-trash-alt" aria-hidden="true"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <footer class="pagination">
      <span>Trang {{ pagination.page }} / {{ pagination.totalPages || 1 }} - {{ pagination.total }} máy</span>
      <div>
        <button type="button" :disabled="pagination.page <= 1" @click="$emit('page-change', pagination.page - 1)">
          Trước
        </button>
        <button
          type="button"
          :disabled="pagination.page >= pagination.totalPages"
          @click="$emit('page-change', pagination.page + 1)"
        >
          Sau
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import MachineStatusBadge from './MachineStatusBadge.vue'

const props = defineProps({
  machines: {
    type: Array,
    default: () => []
  },
  pagination: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['edit', 'delete', 'page-change', 'sort'])

// Tính STT theo trang hiện tại của bảng.
function rowIndex(index) {
  return (props.pagination.page - 1) * props.pagination.limit + index + 1
}

// Format timestamp tín hiệu cuối trong bảng máy.
function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('vi-VN')
}
</script>

<style scoped>
.table-shell {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

table {
  width: 100%;
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

th:nth-child(2),
th:nth-child(3) {
  cursor: pointer;
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

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.actions button,
.actions a,
.pagination button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-weight: 700;
  text-decoration: none;
}

.actions .action-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.actions .action-icon:hover {
  transform: translateY(-1px);
}

.actions .view {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #0f62b4;
}

.actions .edit {
  border-color: #fde68a;
  background: #fef3c7;
  color: #a16207;
}

.actions .danger {
  border-color: #fecaca;
  background: #fee2e2;
  color: #dc2626;
}

.pagination button {
  padding: 7px 10px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  color: #4b5563;
}

.pagination div {
  display: flex;
  gap: 8px;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
