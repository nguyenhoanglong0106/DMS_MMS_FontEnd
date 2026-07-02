import { ref, computed } from 'vue'

export const collapsed = ref(false)

export const sidebarWidth = computed(() =>
  collapsed.value ? '72px' : '240px'
)

export const toggleSidebar = () => {
  collapsed.value = !collapsed.value
}