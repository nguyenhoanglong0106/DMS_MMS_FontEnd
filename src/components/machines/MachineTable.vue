<template>
  <div class="table-shell">
    <table>
      <colgroup>
        <col class="col-index" />
        <col class="col-code" />
        <col class="col-name" />
        <col class="col-location" />
        <col class="col-signal" />
        <col class="col-connection" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th>STT</th>
          <th @click="$emit('sort', 'code')">Mã máy</th>
          <th @click="$emit('sort', 'name')">Tên máy</th>
          <th>Khu vực</th>
          <th>Signal Keys</th>
          <th>Kết nối</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="7" class="empty">Đang tải dữ liệu...</td>
        </tr>
        <tr v-else-if="machines.length === 0">
          <td colspan="7" class="empty">Chưa có máy phù hợp.</td>
        </tr>
        <tr v-for="(machine, index) in machines" v-else :key="machine._id">
          <td>{{ rowIndex(index) }}</td>
          <td class="code" :title="machine.code">{{ machine.code }}</td>
          <td :title="machine.name">{{ machine.name }}</td>
          <td :title="machine.location?.location_name || '-'">{{ machine.location?.location_name || '-' }}</td>
          <td :title="machine.signalKeys">{{ machine.signalKeys }}</td>
          <td class="connection-cell">
            <span
              class="connection-badge"
              :title="connectionName(machine)"
            >
              <span class="connection-dot" :style="{ backgroundColor: connectionColor(machine) }"></span>
              <span class="connection-name">{{ connectionName(machine) }}</span>
            </span>
          </td>
          <td class="actions">
            <div class="action-list">
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
            </div>
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

defineEmits(['edit', 'delete', 'page-change', 'sort'])

const ONLINE_CONNECT_ID = '1'
const OFFLINE_CONNECT_ID = '2'

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
.table-shell {
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
  scrollbar-gutter: stable;
}

table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.col-index {
  width: 72px;
}

.col-code {
  width: 170px;
}

.col-name {
  width: 250px;
}

.col-location {
  width: 180px;
}

.col-signal {
  width: 250px;
}

.col-connection {
  width: 190px;
}

.col-actions {
  width: 170px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  vertical-align: middle;
}

td:not(.actions):not(.connection-cell) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  background: var(--table-header-bg);
  color: var(--text-color);
  font-weight: 800;
}

th:nth-child(2),
th:nth-child(3) {
  cursor: pointer;
}

.code {
  color: var(--primary-color);
  font-weight: 800;
}

.empty {
  padding: 34px;
  color: var(--muted-color);
  text-align: center;
}

.actions {
  white-space: nowrap;
}

.connection-cell {
  white-space: nowrap;
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

.actions button,
.actions a,
.pagination button {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font-weight: 700;
  text-decoration: none;
}

.actions .action-icon {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.actions .action-icon:hover {
  border-color: currentColor;
}

.actions .view {
  border-color: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
  color: var(--primary-color);
}

.actions .edit {
  border-color: color-mix(in srgb, #d97706 36%, var(--border-color));
  background: color-mix(in srgb, #d97706 12%, var(--surface-bg));
  color: #d97706;
}

.actions .danger {
  border-color: color-mix(in srgb, var(--error-text) 36%, var(--border-color));
  background: var(--error-bg);
  color: var(--error-text);
}

.pagination button {
  padding: 7px 10px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  color: var(--muted-color);
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
