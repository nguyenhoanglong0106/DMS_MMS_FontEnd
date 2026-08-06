<template>
  <div v-if="show" class="modal-backdrop">
    <form class="modal" @submit.prevent="submitForm">
      <header>
        <h2>{{ machine ? 'Sửa máy' : 'Thêm máy' }}</h2>
        <button type="button" @click="$emit('close')">×</button>
      </header>

      <p v-if="error" class="error">{{ error }}</p>

      <label>
        Mã máy
        <input v-model="form.code" type="text" placeholder="DC1ED5A0491" @input="$emit('clear-error')" />
      </label>
      <label>
        Tên máy
        <input v-model="form.name" type="text" placeholder="Máy ép số 01" @input="$emit('clear-error')" />
      </label>
      <label>
        Khu vực
        <select v-model="form.location_id" @change="$emit('clear-error')">
          <option value="">Chọn khu vực</option>
          <option v-for="location in locations" :key="location.location_id" :value="location.location_id">
            {{ location.location_name }}
          </option>
        </select>
      </label>
      <label>
        Signal Keys
        <input
          v-model="form.signalKeys"
          type="text"
          placeholder="DC1ED5A049D0"
          :class="{ 'has-warning': signalKeyNotice.type === 'warning' }"
          @input="$emit('clear-error')"
        />
        <p class="signal-key-notice" :class="`is-${signalKeyNotice.type}`">
          {{ signalKeyNotice.text }}
        </p>
      </label>
      <footer>
        <button type="button" class="secondary" @click="$emit('close')">Hủy</button>
        <button type="submit" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu' }}</button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  machine: {
    type: Object,
    default: null
  },
  machines: {
    type: Array,
    default: () => []
  },
  locations: {
    type: Array,
    default: () => []
  },
  saving: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'submit', 'clear-error'])
const form = reactive({
  code: '',
  name: '',
  signalKeys: '',
  location_id: ''
})

// Đổ dữ liệu máy đang sửa vào form, hoặc reset form khi tạo mới.
function fillForm() {
  form.code = props.machine?.code || ''
  form.name = props.machine?.name || ''
  form.signalKeys = props.machine?.signalKeys || ''
  form.location_id = props.machine?.location_id || ''
}

watch(() => props.machine, fillForm, { immediate: true })
watch(() => props.show, (show) => show && fillForm())

function splitSignalKeys(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizedSignalKey(value) {
  return String(value || '').trim().toUpperCase()
}

function findDuplicateSignalKey(signalKeys) {
  const seenKeys = new Set()

  for (const signalKey of signalKeys) {
    const normalizedKey = normalizedSignalKey(signalKey)

    if (seenKeys.has(normalizedKey)) {
      return signalKey
    }

    seenKeys.add(normalizedKey)
  }

  return ''
}

// Tìm xem có máy khác (khác máy đang sửa) đã dùng chung Signal Key chưa,
// vì mỗi Signal Key chỉ được gắn cho đúng 1 máy.
function findMachineUsingSignalKey(signalKeys) {
  const currentMachineId = props.machine?._id || props.machine?.id
  const submittedKeys = new Set(signalKeys.map(normalizedSignalKey))

  return props.machines
    .filter((machineItem) => !currentMachineId || String(machineItem._id || machineItem.id) !== String(currentMachineId))
    .map((machineItem) => ({
      machine: machineItem,
      signalKey: splitSignalKeys(machineItem.signalKeys).find((signalKey) =>
        submittedKeys.has(normalizedSignalKey(signalKey))
      )
    }))
    .find((item) => item.signalKey)
}

const signalKeyNotice = computed(() => {
  const signalKeys = splitSignalKeys(form.signalKeys)
  const duplicatedSignalKey = findDuplicateSignalKey(signalKeys)

  if (duplicatedSignalKey) {
    return {
      type: 'warning',
      text: `Signal Key "${duplicatedSignalKey}" đang bị nhập 2 lần trong ô này. Hãy xóa key trùng trước khi lưu.`
    }
  }

  const usedSignalKey = findMachineUsingSignalKey(signalKeys)

  if (usedSignalKey) {
    return {
      type: 'warning',
      text: `Signal Key "${usedSignalKey.signalKey}" đã thuộc về máy ${usedSignalKey.machine.code} - ${usedSignalKey.machine.name}. Mỗi Signal Key chỉ gắn với một máy.`
    }
  }

  return {
    type: 'info',
    text: 'Mỗi Signal Key chỉ được gắn với một máy. Nếu nhập nhiều key, hãy phân tách bằng dấu phẩy.'
  }
})

// Chuẩn hóa và validate form trước khi emit payload cho trang cha lưu.
function submitForm() {
  const signalKeys = splitSignalKeys(form.signalKeys)
  const payload = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    signalKeys: signalKeys.join(', '),
    location_id: form.location_id
  }

  // Validate ở frontend để người dùng thấy lỗi ngay, backend vẫn validate lại.
  if (!payload.code || !payload.name || !payload.location_id || signalKeys.length === 0) {
    emit('submit', payload, 'Vui lòng nhập đủ mã máy, tên máy, khu vực và Signal Keys.')
    return
  }

  const duplicatedSignalKey = findDuplicateSignalKey(signalKeys)

  if (duplicatedSignalKey) {
    emit('submit', payload, `Signal Key "${duplicatedSignalKey}" đang bị nhập trùng trong máy hiện tại.`)
    return
  }

  const usedSignalKey = findMachineUsingSignalKey(signalKeys)

  if (usedSignalKey) {
    emit(
      'submit',
      payload,
      `Signal Key "${usedSignalKey.signalKey}" đã được dùng cho máy ${usedSignalKey.machine.code} - ${usedSignalKey.machine.name}.`
    )
    return
  }

  emit('submit', payload)
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  display: grid;
  gap: 14px;
  width: min(520px, 100%);
  border-radius: 8px;
  padding: 18px;
  background: #ffffff;
}

header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: 20px;
}

label {
  display: grid;
  gap: 6px;
  color: #374151;
  font-weight: 700;
}

input,
select {
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
}

input.has-warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

button {
  border: 1px solid #0f62b4;
  border-radius: 6px;
  padding: 9px 14px;
  background: #0f62b4;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

button.secondary,
header button {
  border-color: #d1d5db;
  background: #ffffff;
  color: #374151;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

input:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.error {
  margin: 0;
  border-radius: 6px;
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
}

.signal-key-notice {
  margin: 0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
}

.signal-key-notice.is-info {
  background: #eff6ff;
  color: #1e40af;
}

.signal-key-notice.is-warning {
  background: #fffbeb;
  color: #92400e;
}
</style>
