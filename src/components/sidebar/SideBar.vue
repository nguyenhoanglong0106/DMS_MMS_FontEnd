<script>
import SidebarItem from './SideBarItem.vue'
import { sidebarMenus } from './menu'
import { collapsed, toggleSidebar, sidebarWidth } from './state'

export default {
  name: 'SideBar',

  components: {
    SidebarItem
  },
  emits: ['logout'],

  // Cung cấp trạng thái sidebar cho template.
  setup() {
    return {
      collapsed,
      toggleSidebar,
      sidebarWidth,
      sidebarMenus
    }
  }
}
</script>

<template>
  <div class="sidebar" :style="{ width: sidebarWidth }">
    <div class="sidebar-header">
      <div class="logo-box" :class="{ collapsed: collapsed }">
        <span v-if="!collapsed">MMS</span>
        <span v-else>M</span>
      </div>
    </div>

   <div class="sidebar-menu">
    <SidebarItem
    v-for="item in sidebarMenus"
    :key="item.title"
    :item="item"
    />
    </div>

    <button
      type="button"
      class="logout-button"
      :class="{ collapsed: collapsed }"
      title="Đăng xuất"
      aria-label="Đăng xuất"
      @click="$emit('logout')"
    >
      <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
      <span v-if="!collapsed">Đăng xuất</span>
    </button>

    <span
      class="collapse-icon"
      :class="{ 'rotate-180': collapsed }"
      @click="toggleSidebar"
    >
      <i class="fas fa-angle-double-left"></i>
    </span>
  </div>
</template>

<style>
:root {
  --sidebar-bg-color: #1f7a4d;
  --sidebar-item-hover: #2f9e63;
  --sidebar-item-active: #145c38;
}
</style>

<style scoped>
.sidebar {
  color: white;
  background-color: var(--sidebar-bg-color);

  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  bottom: 0;

  padding: 14px 8px;
  transition: width 0.3s ease;

  display: flex;
  flex-direction: column;
  align-items: center;

  overflow: visible;
}

.sidebar-menu {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
}

.sidebar-header {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  font-size: 100px;
}

.logo-box {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 2px;
  white-space: nowrap;
  transition: 0.3s ease;
}

.logo-box.collapsed {
  width: 44px;
  height: 44px;
  font-size: 22px;
  letter-spacing: 0;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.16);
}

.logout-button {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 62px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: 10px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  transition: 0.2s ease;
}

.logout-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.logout-button.collapsed {
  left: 50%;
  right: auto;
  width: 42px;
  padding: 0;
  transform: translateX(-50%);
}

.logout-button i {
  font-size: 15px;
}

.collapse-icon {
  position: absolute;
  bottom: 12px;
  left: 50%;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: 0.2s linear;
}

.collapse-icon:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.rotate-180 {
  transform: translateX(-50%) rotate(180deg);
}
</style>
