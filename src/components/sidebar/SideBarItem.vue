<script>
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
      hover: false,
      closeTimer: null
    }
  },

  computed: {
    hasChildren() {
      return this.item.children && this.item.children.length > 0
    },

    showDropdown() {
      return this.hasChildren && (this.hover || this.open)
    },

    isActiveParent() {
      if (!this.hasChildren) {
        return false
      }

      return this.item.children.some((child) => this.isPathActive(child.path))
    }
  },

  beforeUnmount() {
    this.cancelCloseMenu()
  },

  methods: {
    isPathActive(path) {
      const currentPath = this.$route.path

      if (currentPath === path) {
        return true
      }

      if (path === '/machines') {
        return /^\/machines\/[^/]+(?:\/status-history)?$/.test(currentPath)
      }

      return currentPath.startsWith(`${path}/`)
    },

    toggleMenu() {
      if (!this.hasChildren) {
        return
      }

      this.cancelCloseMenu()
      this.open = !this.open
    },

    openMenu() {
      this.cancelCloseMenu()
      this.hover = true
    },

    scheduleCloseMenu() {
      this.cancelCloseMenu()

      this.closeTimer = setTimeout(() => {
        this.open = false
        this.hover = false
        this.closeTimer = null
      }, 180)
    },

    cancelCloseMenu() {
      if (!this.closeTimer) {
        return
      }

      clearTimeout(this.closeTimer)
      this.closeTimer = null
    },

    closeMenu() {
      this.cancelCloseMenu()
      this.open = false
      this.hover = false
    }
  }
}
</script>

<template>
  <div
    class="nav-item"
    @mouseenter="openMenu"
    @mouseleave="scheduleCloseMenu"
  >
    <button
      v-if="hasChildren"
      type="button"
      class="nav-trigger"
      :class="{ active: isActiveParent, open: showDropdown }"
      :aria-expanded="showDropdown"
      aria-haspopup="true"
      @click="toggleMenu"
    >
      <span class="nav-item-content">
        <i :class="item.icon" aria-hidden="true"></i>
        <span>{{ item.title }}</span>
      </span>
      <i class="fas fa-chevron-down nav-arrow" aria-hidden="true"></i>
    </button>

    <router-link
      v-else
      :to="item.path"
      class="nav-link"
      @click="closeMenu"
    >
      <span class="nav-item-content">
        <i :class="item.icon" aria-hidden="true"></i>
        <span>{{ item.title }}</span>
      </span>
    </router-link>

    <div
      v-if="showDropdown"
      class="dropdown-menu"
      @mouseenter="cancelCloseMenu"
      @mouseleave="scheduleCloseMenu"
    >
      <router-link
        v-for="child in item.children"
        :key="child.path"
        :to="child.path"
        class="dropdown-item"
        @click="closeMenu"
      >
        <i :class="child.icon" aria-hidden="true"></i>
        <span>{{ child.title }}</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.nav-item {
  position: relative;
  flex: 0 0 auto;
}

.nav-trigger,
.nav-link {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 14px;
  background: transparent;
  color: #ffffff;
  text-decoration: none;
  cursor: pointer;
  transition: 0.2s ease;
}

.nav-trigger:hover,
.nav-trigger.open,
.nav-link:hover,
.nav-link.router-link-exact-active {
  border-color: transparent;
  background: transparent;
  color: #ffffff;
  box-shadow: inset 0 -3px 0 rgba(255, 255, 255, 0.48);
}

.nav-trigger.active,
.nav-link.router-link-exact-active {
  font-weight: 800;
  background: transparent;
  box-shadow: inset 0 -3px 0 #ffffff;
}

.nav-item-content {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nav-item-content i {
  width: 18px;
  min-width: 18px;
  color: currentColor;
  text-align: center;
  font-size: 15px;
}

.nav-item-content span {
  overflow: hidden;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-arrow {
  color: currentColor;
  font-size: 12px;
  transition: 0.2s ease;
}

.nav-trigger.open .nav-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 230px;
  display: grid;
  gap: 4px;
  padding: 10px 8px 8px;
  border: 1px solid color-mix(in srgb, var(--surface-bg) 18%, transparent);
  border-radius: 8px;
  background: var(--sidebar-bg-color);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--text-color) 18%, transparent);
  z-index: 1001;
}

.dropdown-item {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 6px;
  padding: 0 10px;
  color: #ffffff;
  text-decoration: none;
  transition: 0.2s ease;
}

.dropdown-item i {
  width: 18px;
  min-width: 18px;
  color: rgba(255, 255, 255, 0.86);
  text-align: center;
  font-size: 14px;
}

.dropdown-item span {
  overflow: hidden;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-item:hover,
.dropdown-item.router-link-exact-active {
  background: var(--sidebar-item-active);
  color: #ffffff;
  font-weight: 800;
}

@media (max-width: 760px) {
  .nav-item {
    flex: 1 1 auto;
  }

  .nav-trigger,
  .nav-link {
    width: 100%;
    padding: 0 10px;
  }

  .dropdown-menu {
    right: 0;
    left: auto;
    min-width: min(260px, calc(100vw - 32px));
  }
}
</style>
