<script>
import SidebarItem from './SideBarItem.vue'
import { sidebarMenus } from './menu'

export default {
  name: 'SideBar',

  components: {
    SidebarItem
  },
  emits: ['logout'],

  setup() {
    return {
      sidebarMenus
    }
  }
}
</script>

<template>
  <header class="app-header">
    <nav class="header-nav" aria-label="Điều hướng chính">
      <SidebarItem
        v-for="item in sidebarMenus"
        :key="item.title"
        :item="item"
      />

      <button
        type="button"
        class="nav-logout"
        title="Đăng xuất"
        aria-label="Đăng xuất"
        @click="$emit('logout')"
      >
        <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
        <span>Đăng xuất</span>
      </button>
    </nav>
  </header>
</template>

<style>
:root {
  --sidebar-bg-color: #1f7a4d;
  --sidebar-item-hover: #2f9e63;
  --sidebar-item-active: #145c38;
}
</style>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--sidebar-bg-color);
  border-bottom: 1px solid color-mix(in srgb, var(--surface-bg) 18%, transparent);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--text-color) 10%, transparent);
}

.header-nav {
  min-height: 54px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 7px 28px;
  background: var(--sidebar-bg-color);
}

.nav-logout {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-left: auto;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 14px;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  transition: 0.2s ease;
}

.nav-logout:hover {
  border-color: transparent;
  background: transparent;
  color: #ffffff;
  box-shadow: inset 0 -3px 0 rgba(255, 255, 255, 0.48);
}

@media (max-width: 760px) {
  .header-nav {
    align-items: stretch;
    gap: 6px;
    padding: 8px 16px;
  }

  .nav-logout {
    flex: 1 1 auto;
    margin-left: 0;
  }
}
</style>
