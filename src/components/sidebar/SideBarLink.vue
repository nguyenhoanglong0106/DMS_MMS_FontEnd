<script>
import { collapsed } from './state'

export default {
  name: 'SidebarLink',
  props: {
    to: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    }
  },
  // Cung cấp trạng thái thu gọn cho link.
  setup() {
    return { collapsed }
  }
}
</script>

<template>
  <router-link :to="to" class="sidebar-link" :class="{ collapsed: collapsed }">
    <i :class="icon" class="icon"></i>
    <span v-if="!collapsed" class="link-text">
      <slot />
    </span>
  </router-link>
</template>

<style scoped>
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 12px 14px;
  border-radius: 10px;
  text-decoration: none;
  color: white;
  transition: 0.2s ease;
}

.sidebar-link:hover {
  background-color: var(--sidebar-item-hover);
}

.sidebar-link.router-link-exact-active {
  background-color: var(--sidebar-item-active);
}

.icon {
  min-width: 20px;
  font-size: 18px;
  text-align: center;
}

.link-text {
  white-space: nowrap;
}

.sidebar-link.collapsed {
  justify-content: center;
  padding: 12px 0;
}

.sidebar-link.collapsed .icon {
  min-width: auto;
  font-size: 20px;
}
</style>
