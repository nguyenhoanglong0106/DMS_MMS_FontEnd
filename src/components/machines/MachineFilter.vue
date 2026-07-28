<template>
  <section class="machine-filter">
    <input v-model.trim="localFilters.keyword" type="search" placeholder="Tìm mã máy hoặc tên máy" />

    <select v-model="localFilters.location_id">
      <option value="">Tất cả khu vực</option>
      <option v-for="location in locations" :key="location.location_id" :value="location.location_id">
        {{ location.location_name }}
      </option>
    </select>

    <select v-model="localFilters.status_id">
      <option value="">Tất cả trạng thái</option>
      <option v-for="status in statuses" :key="status.status_id" :value="status.status_id">
        {{ status.status_name }}
      </option>
    </select>

    <button type="button" @click="$emit('apply', { ...localFilters })">Lọc</button>
    <button type="button" class="secondary" @click="$emit('reset')">Đặt lại</button>
  </section>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  locations: {
    type: Array,
    default: () => []
  },
  statuses: {
    type: Array,
    default: () => []
  }
})

defineEmits(['apply', 'reset'])

const localFilters = reactive({ ...props.filters })

watch(
  () => props.filters,
  (value) => Object.assign(localFilters, value),
  { deep: true }
)
</script>

<style scoped>
.machine-filter {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(150px, 190px)) auto auto;
  gap: 10px;
  align-items: center;
}

input,
select,
button {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
  background: #ffffff;
}

button {
  border-color: #0f62b4;
  background: #0f62b4;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

button.secondary {
  border-color: #d1d5db;
  background: #ffffff;
  color: #374151;
}

@media (max-width: 980px) {
  .machine-filter {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
