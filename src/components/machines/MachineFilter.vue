<template>
  <section class="machine-filter" :class="{ 'is-dock': variant === 'dock' }">
    <label>
      <span>Tìm kiếm</span>
      <input v-model.trim="localFilters.keyword" type="search" placeholder="Tìm mã máy hoặc tên máy" />
    </label>

    <label>
      <span>Khu vực</span>
      <select v-model="localFilters.location_id">
        <option value="">Tất cả khu vực</option>
        <option v-for="location in locations" :key="location.location_id" :value="location.location_id">
          {{ location.location_name }}
        </option>
      </select>
    </label>

    <button type="button" @click="$emit('apply', { keyword: localFilters.keyword, location_id: localFilters.location_id })">Lọc</button>
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
  variant: {
    type: String,
    default: 'inline'
  }
})

defineEmits(['apply', 'reset'])

// Dùng state cục bộ để gõ mượt, chỉ báo lên cha khi bấm "Lọc"/"Đặt lại".
const localFilters = reactive({ ...props.filters })

// Đồng bộ lại khi cha đổi filters từ bên ngoài (vd: sau khi reset).
watch(
  () => props.filters,
  (value) => Object.assign(localFilters, value),
  { deep: true }
)
</script>

<style scoped>
.machine-filter {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(150px, 190px) auto auto;
  gap: 10px;
  align-items: center;
}

input,
select,
button {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--surface-bg);
  color: var(--text-color);
}

label {
  display: contents;
}

label span {
  display: none;
}

button {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

button.secondary {
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--text-color);
}

@media (max-width: 980px) {
  .machine-filter {
    grid-template-columns: 1fr 1fr;
  }
}

.machine-filter.is-dock {
  grid-template-columns: 1fr;
}

.machine-filter.is-dock label {
  display: grid;
  gap: 7px;
  color: var(--muted-color);
  font-size: 13px;
  font-weight: 800;
}

.machine-filter.is-dock label span {
  display: block;
}

.machine-filter.is-dock input,
.machine-filter.is-dock select,
.machine-filter.is-dock button {
  width: 100%;
  box-sizing: border-box;
}
</style>
