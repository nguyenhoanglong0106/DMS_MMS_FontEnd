<template>
  <div class="machine-table">
    <DataGrid
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      row-key="_id"
      storage-key="machine-registration"
      loading-text="Đang tải dữ liệu..."
      empty-text="Chưa có máy phù hợp."
    >
      <template #cell-connection="{ row }">
        <span class="connection-badge" :title="row._connectionName">
          <span class="connection-dot" :style="{ backgroundColor: row._connectionColor }"></span>
          <span class="connection-name">{{ row._connectionName }}</span>
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div class="action-list">
          <RouterLink
            :to="`/machines/${row._id}`"
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
            @click="$emit('edit', row._source)"
          >
            <i class="fas fa-edit" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="action-icon danger"
            title="Xóa"
            aria-label="Xóa"
            @click="$emit('delete', row._source)"
          >
            <i class="fas fa-trash-alt" aria-hidden="true"></i>
          </button>
        </div>
      </template>
    </DataGrid>

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
import { computed } from 'vue'
import DataGrid from '@/components/grid/DataGrid.vue'

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
  },
  connectionStatuses: {
    type: Array,
    default: () => []
  }
})

defineEmits(['edit', 'delete', 'page-change'])

const ONLINE_CONNECT_ID = '1'
const OFFLINE_CONNECT_ID = '2'

const columns = [
  { key: 'index', field: '_rowIndex', label: 'STT', width: 72, filterable: false },
  { key: 'code', field: 'code', label: 'Mã máy', width: 170, cellClass: 'code', sortable: true, sortKey: 'code' },
  { key: 'name', field: 'name', label: 'Tên máy', width: 250, sortable: true, sortKey: 'name' },
  { key: 'location', field: '_locationName', label: 'Khu vực', width: 180 },
  { key: 'signalKeys', field: 'signalKeys', label: 'Signal Keys', width: 250 },
  { key: 'connection', field: '_connectionName', label: 'Kết nối', width: 190 },
  { key: 'actions', label: 'Thao tác', width: 170, filterable: false, sortable: false, cellClass: 'actions-cell' }
]

const tableRows = computed(() =>
  props.machines.map((machine, index) => ({
    ...machine,
    _source: machine,
    _rowIndex: rowIndex(index),
    _locationName: machine.location?.location_name || '-',
    _connectionName: connectionName(machine),
    _connectionColor: connectionColor(machine)
  }))
)

// Tính STT theo trang hiện tại của bảng.
function rowIndex(index) {
  return (props.pagination.page - 1) * props.pagination.limit + index + 1
}

function machineConnectId(machine) {
  return String(machine.connect_id || machine.connectionStatus?.connect_id || ONLINE_CONNECT_ID)
}

function connectionStatusById(connectId) {
  return props.connectionStatuses.find((status) => String(status.connect_id) === String(connectId)) || null
}

function fallbackConnectionStatus(connectId) {
  return {
    connect_id: String(connectId),
    connect_desc: String(connectId) === OFFLINE_CONNECT_ID ? 'Offline' : 'Online',
    color_code: '#6B7280',
    color: '#6B7280'
  }
}

// Thứ tự ưu tiên: trạng thái theo master data (đã cấu hình màu ở Setting)
// > trạng thái realtime kèm sẵn trong machine > fallback mặc định.
function machineConnectionStatus(machine) {
  const connectId = machineConnectId(machine)

  return connectionStatusById(connectId) || machine.connectionStatus || fallbackConnectionStatus(connectId)
}

function connectionName(machine) {
  return machineConnectionStatus(machine).connect_desc
}

function connectionColor(machine) {
  const status = machineConnectionStatus(machine)

  return status.color_code || status.color || '#6B7280'
}
</script>

<style scoped>
.machine-table {
  display: grid;
}

:deep(.data-grid-shell) {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

:deep(.code) {
  color: var(--primary-color);
  font-weight: 800;
}

.connection-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
  font-weight: 800;
}

.connection-dot {
  flex: 0 0 10px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--text-color) 8%, transparent);
}

.connection-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-list {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
}

.action-icon,
.pagination button {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font-weight: 700;
  text-decoration: none;
}

.action-icon {
  display: inline-flex;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.action-icon:hover {
  border-color: currentColor;
}

.view {
  border-color: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
  color: var(--primary-color);
}

.edit {
  border-color: color-mix(in srgb, #d97706 36%, var(--border-color));
  background: color-mix(in srgb, #d97706 12%, var(--surface-bg));
  color: #d97706;
}

.danger {
  border-color: color-mix(in srgb, var(--error-text) 36%, var(--border-color));
  background: var(--error-bg);
  color: var(--error-text);
}

.pagination {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-top: 0;
  border-radius: 0 0 8px 8px;
  padding: 12px;
  background: var(--surface-bg);
  color: var(--muted-color);
}

.pagination div {
  display: flex;
  gap: 8px;
}

.pagination button {
  padding: 7px 10px;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
