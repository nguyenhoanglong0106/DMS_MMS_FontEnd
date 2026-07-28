<template>
  <div v-if="machine" class="dialog-backdrop">
    <section class="dialog">
      <h2>Xóa máy</h2>
      <p>
        Máy <strong>{{ machine.code }}</strong> sẽ được xóa khỏi collection <strong>machines</strong>.
        Log tín hiệu và lịch sử trạng thái vẫn được giữ theo <strong>machine_id</strong>.
      </p>
      <footer>
        <button type="button" class="secondary" @click="$emit('cancel')">Hủy</button>
        <button type="button" class="danger" :disabled="saving" @click="$emit('confirm', machine)">
          {{ saving ? 'Đang xóa...' : 'Xóa' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
defineProps({
  machine: {
    type: Object,
    default: null
  },
  saving: {
    type: Boolean,
    default: false
  }
})

defineEmits(['cancel', 'confirm'])
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.45);
}

.dialog {
  width: min(440px, 100%);
  border-radius: 8px;
  padding: 18px;
  background: #ffffff;
}

h2 {
  margin: 0 0 10px;
}

p {
  color: #4b5563;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 9px 14px;
  background: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

.danger {
  border-color: #dc2626;
  background: #dc2626;
  color: #ffffff;
}
</style>
