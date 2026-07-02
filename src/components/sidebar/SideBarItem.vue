<script>
import { collapsed } from './state'

export default {
  name: 'SideBarItem',
  props: {
    item: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      open: false,
      hover: false
    }
  },

  setup() {
    return {
      collapsed
    }
  },

  computed: {
    hasChildren() {
      return this.item.children && this.item.children.length > 0
    },

    showSubmenu() {
      if (!this.hasChildren) return false

      if (this.collapsed) {
        return this.hover
      }

      return this.open
    }
  },

  methods: {
    toggleMenu() {
      if (!this.hasChildren) return

      if (!this.collapsed) {
        this.open = !this.open
      }
    }
  }
}
</script>

<template>
  <div
    class="sidebar-item"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <!-- Menu có submenu -->
    <div
      v-if="hasChildren"
      class="menu-parent"
      :class="{ active: open, collapsed: collapsed }"
      @click="toggleMenu"
    >
      <div class="menu-left">
        <i :class="item.icon"></i>
        <span v-if="!collapsed">{{ item.title }}</span>
      </div>

      <i
        v-if="!collapsed"
        class="fas fa-chevron-down menu-arrow"
        :class="{ open: open }"
      ></i>
    </div>

    <!-- Menu thường -->
    <router-link
      v-else
      :to="item.path"
      class="menu-parent"
      :class="{ collapsed: collapsed }"
    >
      <div class="menu-left">
        <i :class="item.icon"></i>
        <span v-if="!collapsed">{{ item.title }}</span>
      </div>
    </router-link>

    <!-- Submenu khi sidebar mở -->
    <div
      v-if="showSubmenu && !collapsed"
      class="submenu"
    >
      <router-link
        v-for="child in item.children"
        :key="child.path"
        :to="child.path"
        class="submenu-item"
      >
        <i :class="child.icon"></i>
        <span>{{ child.title }}</span>
      </router-link>
    </div>

    <!-- Flyout submenu khi sidebar thu nhỏ -->
    <div
      v-if="showSubmenu && collapsed"
      class="flyout-menu"
    >
      <div class="flyout-title">
        {{ item.title }}
      </div>

      <router-link
        v-for="child in item.children"
        :key="child.path"
        :to="child.path"
        class="flyout-item"
      >
        <i :class="child.icon"></i>
        <span>{{ child.title }}</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.sidebar-item {
  width: 100%;
  position: relative;
}

.menu-parent {
  width: 100%;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 2px;
  border-radius: 10px;

  color: white;
  text-decoration: none;
  cursor: pointer;

  transition: 0.2s ease;
}

.menu-parent:hover,
.menu-parent.active,
.menu-parent.router-link-exact-active {
  background-color: var(--sidebar-item-hover);
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-left i {
  width: 22px;
  min-width: 22px;
  text-align: center;
  font-size: 17px;
}

.menu-left span {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.menu-parent.collapsed {
  justify-content: center;
  padding: 0;
}

.menu-parent.collapsed .menu-left {
  width: 100%;
  justify-content: center;
  gap: 0;
}

.menu-parent.collapsed .menu-left i {
  width: 100%;
  min-width: unset;
  font-size: 19px;
}

.menu-arrow {
  font-size: 12px;
  transition: 0.2s ease;
}

.menu-arrow.open {
  transform: rotate(180deg);
}

.submenu {
  margin-top: 6px;
  margin-bottom: 4px;

  background-color: rgba(0, 0, 0, 0.12);
  border-radius: 9px;

  overflow: hidden;
}

.submenu-item {
  height: 42px;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 0 14px 0 28px;

  color: white;
  text-decoration: none;
  font-size: 14px;

  transition: 0.2s ease;
}

.submenu-item i {
  width: 18px;
  text-align: center;
  font-size: 13px;
}

.submenu-item:hover,
.submenu-item.router-link-exact-active {
  background-color: var(--sidebar-item-active);
}

/* Flyout khi sidebar thu nhỏ */
.flyout-menu {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);

  width: 220px;
  padding: 8px;

  background-color: #1f7a4d;
  border-radius: 10px;

  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);

  z-index: 9999;
}

.flyout-title {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  margin-bottom: 6px;
}

.flyout-item {
  height: 40px;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 0 12px;
  border-radius: 8px;

  color: white;
  text-decoration: none;
  font-size: 14px;

  transition: 0.2s ease;
}

.flyout-item i {
  width: 18px;
  text-align: center;
}

.flyout-item:hover,
.flyout-item.router-link-exact-active {
  background-color: var(--sidebar-item-active);
}
</style>