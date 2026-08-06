<template>
  <span class="status-badge" :class="`is-${size}`">
    <span
      v-if="showDot"
      class="status-dot"
      :style="{ backgroundColor: displayColor }"
      aria-hidden="true"
    ></span>
    <span>{{ displayName }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { getStatusById } from '@/constants/machine-status'

const props = defineProps({
  statusId: {
    type: [Number, String],
    default: null
  },
  statusName: {
    type: String,
    default: ''
  },
  statusColor: {
    type: String,
    default: ''
  },
  showDot: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'md'
  }
})

// Ưu tiên tên/màu truyền qua props (đã lấy sẵn từ master data), nếu thiếu
// mới tra theo statusId trong constants làm fallback.
const fallbackStatus = computed(() => getStatusById(props.statusId))
const displayName = computed(() => props.statusName || fallbackStatus.value?.name || 'Chưa có dữ liệu')
const displayColor = computed(() => props.statusColor || fallbackStatus.value?.color || '#6B7280')
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-weight: 700;
  white-space: nowrap;
}

.status-badge.is-sm {
  gap: 6px;
  font-size: 12px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}
</style>
