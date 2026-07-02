import { ref, computed } from 'vue'

export const collapsed = ref(false)

// Tính chiều rộng sidebar theo trạng thái thu gọn.
export const sidebarWidth = computed(() =>
  collapsed.value ? '72px' : '160px'
)

// Đảo trạng thái thu gọn của sidebar.
export const toggleSidebar = () => {
  collapsed.value = !collapsed.value
}
